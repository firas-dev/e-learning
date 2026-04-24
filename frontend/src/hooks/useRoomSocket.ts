import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export type RoomEvent =
  | { type: "challenge-live";     challengeId: string; title: string; endsAt: string }
  | { type: "challenge-over";     challengeId: string }
  | { type: "leaderboard-updated"; roomId: string }
  | { type: "leaderboard-revealed"; challengeId: string }
  | { type: "badge-earned";       userId: string; badge: { id: string; name: string; icon: string } }
  | { type: "new-announcement";   announcement: { title: string; body: string } }
  | { type: "timer-sync";         challengeId: string; endsAt: string }
  | { type: "new-thread";         challengeId: string; thread: unknown };

export function useRoomSocket(roomId: string, userId: string) {
  const socketRef = useRef<Socket | null>(null);
  const [liveEvent, setLiveEvent] = useState<RoomEvent | null>(null);

  useEffect(() => {
    if (!roomId || !userId) return;

    const socket = io("http://localhost:5000");
    socketRef.current = socket;

    socket.emit("join-room-competition", { roomId, userId });

    const EVENTS = [
      "challenge-live",
      "challenge-over",
      "leaderboard-updated",
      "leaderboard-revealed",
      "badge-earned",
      "new-announcement",
      "timer-sync",
      "new-thread",
    ] as const;

    EVENTS.forEach((event) => {
      socket.on(event, (data) => {
        setLiveEvent({ type: event, ...data } as RoomEvent);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, userId]);

  return { liveEvent, socket: socketRef.current };
}