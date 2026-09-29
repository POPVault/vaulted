import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  questionnaires,
  type NewQuestionnaire,
  type Questionnaire,
} from "@/db/schema";
import { AlreadySubmittedError } from "./errors";
import { write, type Executor } from "./executor";

export async function getQuestionnaire(
  investorId: number,
  offeringId: number,
  executor: Executor = db,
): Promise<Questionnaire | null> {
  const [row] = await executor
    .select()
    .from(questionnaires)
    .where(
      and(
        eq(questionnaires.investorId, investorId),
        eq(questionnaires.offeringId, offeringId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export type CreateQuestionnaireInput = Omit<
  NewQuestionnaire,
  "id" | "createdAt"
>;

/** Inserts the questionnaire. Throws AlreadySubmittedError on a second submit. */
export async function createQuestionnaire(
  input: CreateQuestionnaireInput,
): Promise<Questionnaire> {
  const [row] = await write(() =>
    db
      .insert(questionnaires)
      .values(input)
      .onConflictDoNothing({
        target: [questionnaires.investorId, questionnaires.offeringId],
      })
      .returning(),
  );
  if (!row) throw new AlreadySubmittedError("Questionnaire already submitted");
  return row;
}
