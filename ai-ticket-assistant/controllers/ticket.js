import { inngest } from "../inngest/client.js";
import Ticket from "../models/ticket.js";
import User from "../models/user.js"

export const createTicket = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }
    const newTicket = await Ticket.create({
      title,
      description,
      createdBy: req.user._id.toString(),
    });

    await inngest.send({
      name: "ticket/created",
      data: {
        ticketId: (await newTicket)._id.toString(),
        title,
        description,
        createdBy: req.user._id.toString(),
      },
    });
    return res.status(201).json({
      message: "Ticket created and processing started",
      ticket: newTicket,
    });
  } catch (error) {
    console.error("Error creating ticket", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getTickets = async (req, res) => {
  try {
    const user = req.user;
    let tickets = [];
    if (user.role !== "user") {
      tickets = await Ticket.find({})
        .populate("assignedTo", ["email", "_id"])
        .sort({ createdAt: -1 });
    } else {
      tickets = await Ticket.find({ createdBy: user._id })
        .select("title description status createdAt")
        .sort({ createdAt: -1 });
    }
    return res.status(200).json({ tickets }); // <-- wrap in { tickets }
  } catch (error) {
    console.error("Error fetching tickets", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getTicket = async (req, res) => {
  try {
    const user = req.user;
    let ticket;

    if (user.role !== "user") {
      ticket = await Ticket.findById(req.params.id)
        .populate("assignedTo", ["email", "_id"])
        .populate("comments.by", ["email", "_id"])
        .populate("history.by", ["email", "_id"]); 
    } else {
      ticket = await Ticket.findOne({
        createdBy: user._id,
        _id: req.params.id,
      })
        .populate("assignedTo", ["email", "_id"])
        .populate("comments.by", ["email", "_id"])
        .populate("history.by", ["email", "_id"]); 
    }

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    return res.status(200).json({ ticket });
  } catch (error) {
    console.error("Error fetching ticket", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const { status, assignedTo } = req.body;
    const ticket = await Ticket.findById(req.params.id).populate("assignedTo", ["email", "_id"]);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const history = [];

    // Log status change
    if (status && status !== ticket.status) {
      history.push({
        action: "status_update",
        by: req.user._id,
        from: ticket.status,
        to: status,
        at: new Date()
      });
      ticket.status = status;
    }

    // Log reassignment
    if (assignedTo && assignedTo !== String(ticket.assignedTo?._id || ticket.assignedTo)) {
      let fromUser = ticket.assignedTo
        ? await User.findById(ticket.assignedTo._id || ticket.assignedTo)
        : null;
      let toUser = assignedTo ? await User.findById(assignedTo) : null;

      history.push({
        action: "reassignment",
        by: req.user._id,
        from: fromUser ? fromUser.email : "",
        to: toUser ? toUser.email : "",
        at: new Date()
      });
      ticket.assignedTo = assignedTo;
    }

    if (history.length) {
      ticket.history = ticket.history.concat(history);
    }

    await ticket.save();
    await ticket.populate("assignedTo", ["email", "_id"]);
    await ticket.populate("comments.by", ["email", "_id"]);
    await ticket.populate("history.by", ["email", "_id"]);
    res.json({ ticket });
  } catch (error) {
    console.error("Update ticket error:", error);
    res.status(500).json({ message: "Update failed", details: error.message });
  }
};
export const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Comment text required" });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.comments.push({
      by: req.user._id,
      text,
      at: new Date()
    });

    ticket.history.push({
      action: "comment",
      by: req.user._id,
      from: "",
      to: text,
      at: new Date()
    });

    await ticket.save();
    await ticket.populate("comments.by", ["email", "_id"]);
    await ticket.populate("history.by", ["email", "_id"]);
    res.json({ ticket });
  } catch (error) {
    res.status(500).json({ message: "Failed to add comment", details: error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    console.log("Ticket ID:", req.params.id);
    console.log("Comment ID:", req.params.commentId);
    console.log("User:", req.user);

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      console.log("Ticket not found");
      return res.status(404).json({ message: "Ticket not found" });
    }

    const comment = ticket.comments.id(req.params.commentId);
    if (!comment) {
      console.log("Comment not found in ticket.comments:", ticket.comments.map(c => c._id));
      return res.status(404).json({ message: "Comment not found" });
    }

    // Only admin or comment author can delete
    if (
      req.user.role !== "admin" &&
      String(comment.by) !== String(req.user._id)
    ) {
      console.log("Not authorized");
      return res.status(403).json({ message: "Not authorized" });
    }
      // Log the deletion in history
      ticket.history.push({
      action: "delete_comment",
      by: req.user._id,
      from: comment.text,
      to: "",
      at: new Date()
    });
    
    // Remove the comment by filtering
    ticket.comments = ticket.comments.filter(
      c => String(c._id) !== String(req.params.commentId)
    );

    ticket.history = ticket.history.filter(
      h => !(h.action === "comment" && h.to === comment.text && String(h.by) === String(comment.by))
    );

    await ticket.save();
    await ticket.populate("comments.by", ["email", "_id"]);
    await ticket.populate("history.by", ["email", "_id"]);
    res.json({ ticket });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ message: "Delete failed", details: error.message });
  }
};