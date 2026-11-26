import { Router } from "express";
import { createIncident,streamIncident } from "../controllers/incidentController.js";
const router=Router();router.post("/incidents",createIncident);router.get("/stream",streamIncident);export default router;
