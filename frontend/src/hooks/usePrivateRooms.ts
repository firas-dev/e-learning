import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

export interface RoomMember {
  _id: string;
  fullName: string;
  email: string;
}

export interface InvitedEmail {
  email: string;
  status: "pending" | "accepted" | "declined";
  invitedAt: string;
  respondedAt?: string;
  studentId?: string;
}

export interface PrivateRoom {
  _id: string;
  name: string;
  description?: string;
  teacherId: RoomMember | string;
  members: RoomMember[];
  invitedEmails: InvitedEmail[];
  isActive: boolean;
  createdAt: string;
}

export interface Invitation {
  roomId: string;
  roomName: string;
  roomDescription?: string;
  teacher: RoomMember;
  invitedAt: string;
}

export function useTeacherRooms() {
  const [rooms, setRooms] = useState<PrivateRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRooms = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/rooms/teacher`);
      setRooms(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load rooms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const createRoom = async (name: string, description?: string) => {
    const res = await axios.post(`${API}/rooms`, { name, description });
    setRooms((prev) => [res.data, ...prev]);
    return res.data;
  };

  const inviteStudents = async (roomId: string, emails: string[]) => {
    const res = await axios.post(`${API}/rooms/${roomId}/invite`, { emails });
    setRooms((prev) =>
      prev.map((r) => (r._id === roomId ? { ...r, ...res.data.room } : r))
    );
    return res.data;
  };

  const removeMember = async (roomId: string, memberId: string) => {
    await axios.delete(`${API}/rooms/${roomId}/members/${memberId}`);
    setRooms((prev) =>
      prev.map((r) =>
        r._id === roomId
          ? { ...r, members: r.members.filter((m) => m._id !== memberId) }
          : r
      )
    );
  };

  const deleteRoom = async (roomId: string) => {
    await axios.delete(`${API}/rooms/${roomId}`);
    setRooms((prev) => prev.filter((r) => r._id !== roomId));
  };

  return { rooms, loading, error, createRoom, inviteStudents, removeMember, deleteRoom, refetch: fetchRooms };
}

export function useStudentRooms() {
  const [rooms, setRooms] = useState<PrivateRoom[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [roomsRes, invitesRes, countRes] = await Promise.all([
        axios.get(`${API}/rooms/student`),
        axios.get(`${API}/rooms/invitations`),
        axios.get(`${API}/rooms/invitations/count`),
      ]);
      setRooms(roomsRes.data);
      setInvitations(invitesRes.data);
      setPendingCount(countRes.data.count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const respond = async (roomId: string, action: "accept" | "decline") => {
    await axios.patch(`${API}/rooms/${roomId}/respond`, { action });
    await fetchAll();
  };

  return { rooms, invitations, pendingCount, loading, respond, refetch: fetchAll };
}