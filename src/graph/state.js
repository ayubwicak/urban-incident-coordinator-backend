import { Annotation } from "@langchain/langgraph";

export const IncidentState = Annotation.Root({
    incident: Annotation({ default: () => ({}) }),

    triageResult: Annotation({ default: () => ({}) }),
    policyResult: Annotation({ default: () => ({}) }),
    optimizerResult: Annotation({ default: () => ({}) }),
    criticResult: Annotation({ default: () => ({}) }),

    attempt: Annotation({ default: () => 0 }),

    logs: Annotation({
        reducer: (previous, next) => previous.concat(next),
        default: () => []
    }),

    flagged: Annotation({ default: () => false }),
    decision: Annotation({ default: () => null })
});