import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { addComment, createTicket, deleteComment, getTicket, getTickets, updateTicket } from "../controllers/ticket.js";

const router = express.Router();

router.get("/", authenticate, getTickets);
router.get("/:id", authenticate, getTicket);
router.post("/", authenticate, createTicket);
router.patch("/:id", authenticate, updateTicket);
router.post("/:id/comment", authenticate, addComment);
router.delete("/:id/comment/:commentId", authenticate, deleteComment);

export default router;
