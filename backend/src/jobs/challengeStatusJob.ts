import cron from "node-cron";
import Challenge from "../models/Challenge";
import Submission from "../models/Submission";
import RoomStudent from "../models/RoomStudent";
import mongoose from "mongoose";
import { BADGE_DEFINITIONS } from "../utils/gamificationEngine";

// io is imported lazily to avoid circular dependency
let _io: any = null;
export function setIo(io: any) { _io = io; }

function emit(room: string, event: string, data: unknown) {
  if (_io) _io.to(room).emit(event, data);
}

async function awardTopBadgesForChallenge(challengeId: string, roomId: string) {
  const top3 = await Submission.aggregate([
    {
      $match: {
        challengeId: new mongoose.Types.ObjectId(challengeId),
        status: { $in: ["graded","auto_graded"] },
      },
    },
    { $sort: { totalScore: -1, submittedAt: 1 } },
    { $group: { _id: "$studentId", best: { $first: "$$ROOT" } } },
    { $sort: { "best.totalScore": -1 } },
    { $limit: 3 },
  ]);

  const badgeDef = BADGE_DEFINITIONS.find((b) => b.id === "top_3")!;

  for (const entry of top3) {
    const studentId = entry._id;
    const updated = await RoomStudent.findOneAndUpdate(
      { studentId, roomId, "badges.id": { $ne: "top_3" } },
      { $push: { badges: { ...badgeDef, earnedAt: new Date() } } },
      { new: true }
    );
    if (updated) {
      emit(`room:${roomId}`, "badge-earned", { userId: String(studentId), badge: badgeDef });
    }
  }
}

export function startChallengeStatusJob() {
  // Every minute: auto-activate and auto-complete challenges
  cron.schedule("* * * * *", async () => {
    const now = new Date();

    try {
      // Activate upcoming challenges whose start time has passed
      const toActivate = await Challenge.find({ status: "upcoming", startsAt: { $lte: now } });
      for (const c of toActivate) {
        c.status = "active";
        await c.save();
        emit(`room:${String(c.roomId)}`, "challenge-live", {
          challengeId: c._id,
          title:       c.title,
          endsAt:      c.endsAt,
        });
        console.log(`[ChallengeJob] Activated: ${c.title}`);
      }

      // Complete active challenges past their end time
      const toComplete = await Challenge.find({ status: "active", endsAt: { $lte: now } });
      for (const c of toComplete) {
        c.status = "completed";
        await c.save();
        emit(`room:${String(c.roomId)}`, "challenge-over", { challengeId: c._id });

        if (c.hideLeaderboard) {
          emit(`room:${String(c.roomId)}`, "leaderboard-revealed", { challengeId: c._id });
        }

        await awardTopBadgesForChallenge(String(c._id), String(c.roomId));
        console.log(`[ChallengeJob] Completed: ${c.title}`);
      }
    } catch (err) {
      console.error("[ChallengeJob] Error:", err);
    }
  });

  console.log("🟢 Challenge status job started");
}