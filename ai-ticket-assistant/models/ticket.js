import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema({
  title: String,
  description: String,
  status: { type: String, default: "TODO" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  priority: String,
  deadline: Date,
  helpfulNotes: String,
  relatedSkills: [String],
  createdAt: { type: Date, default: Date.now },
  
  comments: [
    {
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      text: String,
      at: { type: Date, default: Date.now }
    }
  ],
  
  history: [
    {
      action: String,
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      from: String,
      to: String,
      at: { type: Date, default: Date.now }
    }
  ]
});

export default mongoose.model("Ticket", ticketSchema);
