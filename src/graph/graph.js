import { StateGraph, START, END } from "@langchain/langgraph";
import { IncidentState } from "./state.js";

import {
    triageNode,
    policyNode,
    optimizerNode,
    criticNode,
    decisionNode
} from "./nodes.js";

function auditRoute(s) {
    const passed =
        s.criticResult?.citation_valid &&
        s.criticResult?.budget_available &&
        s.criticResult?.team_not_overloaded;

    if (passed) {
        return "finalize";
    }

    if (s.attempt < 3) {
        return "optimizer";
    }

    return "finalize";
}

export const incidentGraph = new StateGraph(IncidentState)
    .addNode("triage", triageNode)
    .addNode("policy", policyNode)
    .addNode("optimizer", optimizerNode)
    .addNode("critic", criticNode)
    .addNode("finalize", decisionNode)

    .addEdge(START, "triage")
    .addEdge("triage", "policy")
    .addEdge("policy", "optimizer")
    .addEdge("optimizer", "critic")

    .addConditionalEdges("critic", auditRoute, {
        optimizer: "optimizer",
        finalize: "finalize"
    })

    .addEdge("finalize", END)
    .compile();