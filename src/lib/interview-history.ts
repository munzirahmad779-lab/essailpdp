import type { UIMessage } from "ai";
export type InterviewMessage = UIMessage<{ segmentId: string }>;
export type Segment = { id: string; title: string; interviewer_name: string; created_at: string };
export function orderedSegments(segments: Segment[]) {
  return [...segments].sort((a, b) => a.created_at.localeCompare(b.created_at));
}
export function messagesForSegment(messages: InterviewMessage[], segmentId: string) {
  return messages.filter((message) => message.metadata?.segmentId === segmentId);
}
export function messageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}
