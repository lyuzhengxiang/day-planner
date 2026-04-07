"use client";

import { useRouter } from "next/navigation";
import GoalSetupFlow from "./GoalSetupFlow";

export default function GoalSetupPanel() {
  const router = useRouter();

  return <GoalSetupFlow onComplete={() => router.refresh()} />;
}
