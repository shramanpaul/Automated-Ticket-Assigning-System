import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { jsonRef } from "react";

export default function TicketDetailsPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState(ticket?.status || "");
  const [newAssignee, setNewAssignee] = useState("");
  const [users, setUsers] = useState([]);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/tickets/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        if (res.ok) {
          setTicket(data.ticket);
          console.log("Ticket from backend:", data.ticket); // Add this line
        } else {
          alert(data.message || "Failed to fetch ticket");
        }
      } catch (err) {
        console.error(err);
        alert("Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

useEffect(() => {
  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.role !== "moderator" && user?.role !== "admin") return;
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    // Include both moderators and admins
    setUsers(
      data.filter(
        u =>
          (u.role === "moderator" || u.role === "admin")
          // && u._id !== user._id //for assigning itself the ticket
      )
    );
    console.log("Fetched Users: ", data);
  };
  fetchUsers();
}, []);

  useEffect(() => {
  if (ticket?.status) setNewStatus(ticket.status);
  }, [ticket]);

  if (loading)
    return <div className="text-center mt-10">Loading ticket details...</div>;
  if (!ticket) return <div className="text-center mt-10">Ticket not found</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Ticket Details</h2>

      <div className="card bg-gray-800 shadow p-4 space-y-4">
        <h3 className="text-xl font-semibold">{ticket.title}</h3>
        <p>{ticket.description}</p>

        {ticket.status && (
          <>
            <div className="divider">Metadata</div>
            <p>
              <strong>Status:</strong> {ticket.status}
            </p>
            {ticket.priority && (
              <p>
                <strong>Priority:</strong> {ticket.priority}
              </p>
            )}

            {ticket.relatedSkills?.length > 0 && (
              <p>
                <strong>Related Skills:</strong>{" "}
                {ticket.relatedSkills.join(", ")}
              </p>
            )}

            {ticket.helpfulNotes && (
              <div>
                <strong>Helpful Notes:</strong>
                <div className="prose max-w-none rounded mt-2">
                  <ReactMarkdown>{ticket.helpfulNotes}</ReactMarkdown>
                </div>
              </div>
            )}

            {ticket.assignedTo && (
              <p>
                <strong>Assigned To:</strong> {ticket.assignedTo?.email}
              </p>
            )}

            {ticket.createdAt && (
              <p className="text-sm text-gray-500 mt-2">
                Created At: {new Date(ticket.createdAt).toLocaleString()}
              </p>
            )}
          </>
        )}
    <pre
  ref={jsonRef}
  style={{
    color: "white",
    background: "black",
    overflow: "auto",
    wordBreak: "break-all",
    padding: "1em",
    borderRadius: "0.5em",
    maxHeight: "300px",
    marginTop: "1em",
    position: "relative"
  }}
>
      {JSON.stringify(ticket, null, 2)}
    </pre>
    <button
  className="btn btn-sm btn-outline mt-2"
  onClick={() => {
    navigator.clipboard.writeText(JSON.stringify(ticket, null, 2));
  }}
>
  Copy JSON
</button>
      </div>
            {ticket.assignedTo && (JSON.parse(localStorage.getItem("user"))?.email === ticket.assignedTo.email || JSON.parse(localStorage.getItem("user"))?.role === "admin") && (
    <div className="mt-6 p-4 bg-base-200 rounded">
      <h3 className="font-bold mb-2">Update Ticket</h3>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const token = localStorage.getItem("token");
          const res = await fetch(
            `${import.meta.env.VITE_SERVER_URL}/tickets/${ticket._id}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                status: newStatus,
                assignedTo: newAssignee || undefined,
              }),
            }
          );
          const data = await res.json();
          if (res.ok) {
            setTicket(data.ticket);
            alert("Ticket updated!");
          } else {
            alert(data.message || "Update failed");
          }
        }}
        className="space-y-3"
      >
        <div>
          <label className="block mb-1 font-semibold">Status</label>
          <select
            className="select select-bordered w-full"
            value={newStatus}
            onChange={e => setNewStatus(e.target.value)}
          >
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </div>
        <div>
          <label className="block mb-1 font-semibold">Reassign To (Moderator/Admin)</label>
          <select
            className="select select-bordered w-full"
            value={newAssignee}
            onChange={e => setNewAssignee(e.target.value)}
          >
            <option value="">-- No Change --</option>
            {users.map(u => (
              <option key={u._id} value={u._id}>
                {u.email}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" type="submit">
          Update Ticket
        </button>
      </form>
    </div>
  )}
    </div>
  );
}
