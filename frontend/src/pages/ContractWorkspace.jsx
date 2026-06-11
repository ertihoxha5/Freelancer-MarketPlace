import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  fetchContractWorkspace,
  addWorkspaceTodo,
  updateWorkspaceTodo,
  deleteWorkspaceTodo,
  addWorkspaceSection,
  updateWorkspaceSection,
  deleteWorkspaceSection,
} from "../apiServices.js";
import { FiEdit2, FiTrash2, FiEye, FiEyeOff, FiChevronUp, FiChevronDown, FiPlus, FiVideo, FiVideoOff, FiMic, FiMicOff, FiPhoneOff } from "react-icons/fi";
import { getSocket } from "../socket/socketClient";

export default function ContractWorkspace() {
  const { id: contractID } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newTodo, setNewTodo] = useState({ title: "", description: "", dueDate: "", status: "todo" });

  const [showAddSection, setShowAddSection] = useState(false);
  const [newSection, setNewSection] = useState({ title: "", type: "note", content: "", items: [] });
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editSectionData, setEditSectionData] = useState(null);

  const [isEditingMode, setIsEditingMode] = useState(false);

  const [isInMeeting, setIsInMeeting] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isJoiningMeeting, setIsJoiningMeeting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteUserName, setRemoteUserName] = useState("");
  const [meetingError, setMeetingError] = useState("");
  const [meetingParticipants, setMeetingParticipants] = useState([]);
  const [meetingChat, setMeetingChat] = useState([]);
  const [showMeetingUI, setShowMeetingUI] = useState(false);
  const [isFloating, setIsFloating] = useState(false);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const socketRef = useRef(null);
  const meetingChatRef = useRef(null);

  const isFreelancer = data?.isFreelancer;
  const isMulti = data?.isMultiFreelancerProject;
  const projectID = data?.projectID;

  const SharedBanner = isMulti ? (
    <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
      This is the <strong>shared project workspace</strong> for all hired freelancers and the client on this project. Changes are visible to everyone.
      {projectID && <span className="ml-2 text-xs opacity-70">(Project #{projectID})</span>}
    </div>
  ) : null;

  async function loadWorkspace() {
    setLoading(true);
    setError("");
    try {
      const res = await fetchContractWorkspace(contractID);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (contractID) loadWorkspace();
  }, [contractID]);

  async function handleAddTodo(e) {
    e.preventDefault();
    if (!newTodo.title.trim()) return;
    try {
      await addWorkspaceTodo(contractID, newTodo);
      setNewTodo({ title: "", description: "", dueDate: "", status: "todo" });
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to add todo.");
    }
  }

  async function handleUpdateTodoStatus(todo, newStatus) {
    try {
      await updateWorkspaceTodo(contractID, todo.id, { status: newStatus });
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to update todo.");
    }
  }

  async function handleDeleteTodo(todoId) {
    if (!confirm("Delete this todo?")) return;
    try {
      await deleteWorkspaceTodo(contractID, todoId);
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to delete todo.");
    }
  }

  async function handleAddSection(e) {
    e.preventDefault();
    if (!newSection.title.trim()) return;

    const payload = {
      title: newSection.title.trim(),
      type: newSection.type,
      content: newSection.content || null,
      visible: true,
    };

    if (newSection.type === "checklist") {
      payload.items = Array.isArray(newSection.items) ? newSection.items : [];
    }

    try {
      await addWorkspaceSection(contractID, payload);
      setNewSection({ title: "", type: "note", content: "", items: [] });
      setShowAddSection(false);
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to add section.");
    }
  }

  function startEditSection(section) {
    setEditingSectionId(section.id);
    setEditSectionData({
      title: section.title,
      content: section.content || "",
      items: section.items || [],
      visible: section.visible,
      type: section.type,
    });
  }

  async function saveEditSection(sectionId) {
    try {
      const updatePayload = {
        title: editSectionData.title,
        content: editSectionData.content,
        visible: editSectionData.visible,
      };

      if (editSectionData.type === "checklist" && Array.isArray(editSectionData.items)) {
        updatePayload.items = editSectionData.items;
      }

      await updateWorkspaceSection(contractID, sectionId, updatePayload);
      setEditingSectionId(null);
      setEditSectionData(null);
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to update section.");
    }
  }

  async function toggleSectionVisible(section) {
    try {
      await updateWorkspaceSection(contractID, section.id, { visible: !section.visible });
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to toggle visibility.");
    }
  }

  async function handleDeleteSection(sectionId) {
    if (!confirm("Delete this section?")) return;
    try {
      await deleteWorkspaceSection(contractID, sectionId);
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to delete section.");
    }
  }

  async function moveSection(section, direction) {
    const currentIndex = sections.findIndex((s) => s.id === section.id);
    if (currentIndex === -1) return;

    if (direction === "up" && currentIndex === 0) return;
    if (direction === "down" && currentIndex === sections.length - 1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const target = sections[targetIndex];

    try {

      await Promise.all([
        updateWorkspaceSection(contractID, section.id, { sortOrder: target.sortOrder ?? currentIndex }),
        updateWorkspaceSection(contractID, target.id, { sortOrder: section.sortOrder ?? targetIndex }),
      ]);
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to reorder section.");
    }
  }

  function addContentBlock(type) {
    const defaultTitles = {
      note: "New Note",
      checklist: "To-Do Checklist",
      progress: "Progress Update",
      links: "Useful Resources",
    };

    setNewSection({
      title: defaultTitles[type] || "New Block",
      type,
      content: "",
      items: type === "checklist" ? [{ text: "", done: false }] : [],
    });
    setShowAddSection(true);

    setTimeout(() => {
      const form = document.getElementById("cms-add-form");
      if (form) form.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  async function toggleChecklistItem(section, itemIndex) {
    if (!Array.isArray(section.items)) return;

    const updatedItems = section.items.map((it, idx) =>
      idx === itemIndex ? { ...it, done: !it.done } : it
    );

    try {
      await updateWorkspaceSection(contractID, section.id, { items: updatedItems });
      await loadWorkspace();
    } catch (err) {
      setError(err.message || "Failed to update checklist.");
    }
  }

  async function startLocalStream(videoConstraints = true) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      setMeetingError("Could not access camera/microphone. Please allow permissions.");
      throw err;
    }
  }

  function createPeerConnection() {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("meeting:ice-candidate", {
          contractID,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    return pc;
  }

  function joinMeeting() {
    setMeetingError('');
    setMeetingModalOpen(true);
    setShowMeetingUI(true);
    setIsCallActive(true);
    setMeetingChat([]);
  }

  function setupSignalingListeners(pc, socket) {
    const onOffer = async ({ offer, fromUserID, fromFullName }) => {
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("meeting:answer", {
          contractID,
          answer,
          toUserID: fromUserID,
        });

        setRemoteUserName(fromFullName || "Participant");
      } catch (e) {
        console.error("Error handling offer", e);
      }
    };

    const onAnswer = async ({ answer }) => {
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (e) {
        console.error("Error handling answer", e);
      }
    };

    const onIce = ({ candidate }) => {
      if (pc && candidate) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      }
    };

    const onPeerJoined = ({ userID, fullName }) => {
      setRemoteUserName(fullName || "Participant");
      const myID = Number(user?.id);
      const theirID = Number(userID);
      if (pc && !pc.remoteDescription && myID < theirID) {
        createAndSendOffer(pc, socket, userID);
      }
    };

    const onPeerLeft = () => {
      setRemoteUserName("");
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };

    const onParticipantsUpdated = ({ participants }) => {
      setMeetingParticipants(participants || []);
    };

    const onChatMessage = (msg) => {
      setMeetingChat((prev) => [...prev.slice(-50), msg]);
      setTimeout(() => {
        if (meetingChatRef.current) {
          meetingChatRef.current.scrollTop = meetingChatRef.current.scrollHeight;
        }
      }, 50);
    };

    const onInvited = ({ fromFullName, message }) => {
      setMeetingError(`📨 ${fromFullName}: ${message || "Invited you to the meeting"}`);
      setTimeout(() => setMeetingError(""), 6000);
    };

    socket.on("meeting:offer", onOffer);
    socket.on("meeting:answer", onAnswer);
    socket.on("meeting:ice-candidate", onIce);
    socket.on("meeting:peer-joined", onPeerJoined);
    socket.on("meeting:peer-left", onPeerLeft);
    socket.on("meeting:participants-updated", onParticipantsUpdated);
    socket.on("meeting:chat-message", onChatMessage);
    socket.on("meeting:invited", onInvited);

    socketRef.current._meetingCleanup = () => {
      socket.off("meeting:offer", onOffer);
      socket.off("meeting:answer", onAnswer);
      socket.off("meeting:ice-candidate", onIce);
      socket.off("meeting:peer-joined", onPeerJoined);
      socket.off("meeting:peer-left", onPeerLeft);
      socket.off("meeting:participants-updated", onParticipantsUpdated);
      socket.off("meeting:chat-message", onChatMessage);
      socket.off("meeting:invited", onInvited);
    };
  }

  async function createAndSendOffer(pc, socket, toUserID) {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("meeting:offer", {
        contractID,
        offer,
        toUserID,
      });
    } catch (e) {
      console.error("Failed to create offer", e);
    }
  }

  async function toggleScreenShare() {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = screenStream;
        const videoTrack = screenStream.getVideoTracks()[0];

        const pc = peerConnectionRef.current;
        if (pc && localStreamRef.current) {
          const sender = pc.getSenders().find((s) => s.track.kind === "video");
          if (sender) await sender.replaceTrack(videoTrack);
        }

        videoTrack.onended = () => stopScreenShare();
        setIsScreenSharing(true);
      } else {
        await stopScreenShare();
      }
    } catch (err) {
      setMeetingError("Screen sharing failed or was cancelled.");
    }
  }

  async function stopScreenShare() {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    const pc = peerConnectionRef.current;
    if (pc && localStreamRef.current) {
      const originalVideoTrack = localStreamRef.current.getVideoTracks()[0];
      const sender = pc.getSenders().find((s) => s.track.kind === "video");
      if (sender && originalVideoTrack) await sender.replaceTrack(originalVideoTrack);
    }
    setIsScreenSharing(false);
  }

  function sendMeetingChatMessage() {
    const input = document.getElementById("meeting-chat-input");
    if (!input || !input.value.trim() || !socketRef.current) return;

    const message = input.value.trim();
    socketRef.current.emit("meeting:chat-message", { contractID, message });

    const myMsg = {
      userID: user?.id,
      fullName: user?.fullName || "You",
      message,
      timestamp: new Date().toISOString(),
      isMe: true,
    };
    setMeetingChat((prev) => [...prev.slice(-50), myMsg]);
    input.value = "";

    setTimeout(() => {
      if (meetingChatRef.current) meetingChatRef.current.scrollTop = meetingChatRef.current.scrollHeight;
    }, 10);
  }

  function inviteToMeeting() {
    const link = `${window.location.origin}/contracts/${contractID}/workspace`;
    navigator.clipboard.writeText(link).then(() => {
      setMeetingError("Meeting link copied! Share it with the other party.");
      setTimeout(() => setMeetingError(""), 4000);
    }).catch(() => {
      prompt("Copy this meeting link to invite:", link);
    });

    const socket = getSocket();
    if (socket) {
      socket.emit("meeting:invite", { contractID });
    }
  }

  function toggleMute() {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }

  function toggleVideo() {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  }

  function leaveMeeting() {
    const socket = socketRef.current;

    if (socket) {
      socket.emit("meeting:leave", { contractID });
      if (socket._meetingCleanup) {
        socket._meetingCleanup();
        delete socket._meetingCleanup;
      }
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setIsInMeeting(false);
    setIsCallActive(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setRemoteUserName("");
    setMeetingError("");
    setMeetingChat([]);
    setMeetingParticipants([]);
    setShowMeetingUI(false);
    setIsFloating(false);
  }

  useEffect(() => {
    if (isCallActive && !localStreamRef.current) {
      startMeetingProcess();
    }
  }, [isCallActive]);

  async function startMeetingProcess() {
    setIsJoiningMeeting(true);
    setMeetingError('');

    const socket = getSocket();
    if (!socket) {
      setMeetingError('Realtime connection not available. Please refresh the page.');
      setIsCallActive(false);
      setShowMeetingUI(false);
      setIsJoiningMeeting(false);
      return;
    }
    socketRef.current = socket;

    try {

      await new Promise(resolve => setTimeout(resolve, 80));

      await startLocalStream();

      await new Promise((resolve, reject) => {
        socket.emit('meeting:join', { contractID }, (response) => {
          if (response?.ok) {
            if (response.participants) setMeetingParticipants(response.participants);
            resolve();
          } else {
            reject(new Error(response?.error || 'Failed to join meeting room'));
          }
        });
      });

      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      setIsInMeeting(true);
      setupSignalingListeners(pc, socket);

    } catch (err) {
      console.error('Start meeting process error:', err);
      setMeetingError(err.message || 'Failed to start the meeting. Check camera permissions.');
      leaveMeeting();
    } finally {
      setIsJoiningMeeting(false);
    }
  }

  useEffect(() => {
    return () => {
      if (isInMeeting || isCallActive) {
        leaveMeeting();
      }
    };
  }, [isInMeeting, isCallActive]);

  const isMeetingInProgress = meetingParticipants.length > 0 || isCallActive;

  function addChecklistItem() {
    setNewSection((prev) => ({
      ...prev,
      items: [...(prev.items || []), { text: "", done: false }],
    }));
  }

  function updateChecklistItem(index, field, value) {
    setNewSection((prev) => {
      const items = [...(prev.items || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  }

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar roleID={user?.roleID} />
        <div className="flex-1 p-8">Loading workspace...</div>
      </div>
    );
  }

  const contract = data?.contract;
  const todos = data?.todos || [];
  const sections = data?.sections || [];

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar roleID={user?.roleID} />

        <main className="flex-1 overflow-auto p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">{isMulti ? 'Shared Project Workspace' : 'Contract Workspace'}</h1>
              <p className="mt-1 text-slate-600">
                {isMulti
                  ? (t('sharedWorkspaceDesc') || "Shared project workspace for the client and all hired freelancers on this project.")
                  : `Private collaboration space for ${isFreelancer ? "you and the client" : "you and the freelancer"}`}
              </p>
            </div>
            <Link
              to={isFreelancer ? "/freelancer/contracts" : "/client/contracts"}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              ← Back to Contracts
            </Link>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {SharedBanner}

          {contract && (
            <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Project:</span>{" "}
                  <span className="font-semibold">{contract.projectTitle || contract.title}</span>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>{" "}
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {contract.cStatus}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Value:</span>{" "}
                  <span className="font-medium">${Number(contract.totalAmount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {}
          <section className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">To-Do List</h2>
              <span className="text-xs text-slate-500">Freelancer manages • Client can view</span>
            </div>

            {isFreelancer && (
              <form onSubmit={handleAddTodo} className="mb-4 grid gap-3 md:grid-cols-5">
                <input
                  value={newTodo.title}
                  onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                  placeholder="Task title"
                  className="md:col-span-2 rounded border px-3 py-2 text-sm"
                  required
                />
                <input
                  value={newTodo.description}
                  onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="md:col-span-2 rounded border px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newTodo.dueDate}
                    onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
                    className="flex-1 rounded border px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded bg-[#1a3c2e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#214b38]"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}

            {todos.length === 0 ? (
              <p className="text-sm text-slate-500">No todos yet. {isFreelancer ? "Add your first task above." : ""}</p>
            ) : (
              <div className="divide-y rounded border">
                {todos.map((todo) => (
                  <div key={todo.id} className="flex flex-col gap-1 p-3 text-sm md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{todo.title}</div>
                      {todo.description && <div className="text-slate-600">{todo.description}</div>}
                      {todo.dueDate && <div className="text-xs text-slate-400">Due: {todo.dueDate}</div>}
                    </div>

                    <div className="flex items-center gap-2">
                      {isFreelancer ? (
                        <>
                          <select
                            value={todo.status}
                            onChange={(e) => handleUpdateTodoStatus(todo, e.target.value)}
                            className="rounded border px-2 py-1 text-xs"
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>
                          <button
                            onClick={() => handleDeleteTodo(todo.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          todo.status === "done" ? "bg-emerald-100 text-emerald-700" :
                          todo.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                        }`}>
                          {todo.status.replace("_", " ")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {}
          <section className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                  <FiVideo className="h-5 w-5" /> Video Meeting
                </h2>
                {isMeetingInProgress && !isCallActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-700">
                    ● Meeting in progress ({meetingParticipants.length} here)
                  </span>
                )}

          {}
          {meetingModalOpen && (
            <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4">
              <div className="bg-slate-950 text-white w-full max-w-5xl h-[88vh] rounded-2xl flex flex-col border border-white/10 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-slate-900">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Video Meeting</span>
                    <span className="text-sm text-emerald-400">Contract #{contractID}</span>
                    {isJoiningMeeting && <span className="text-yellow-400 text-sm">Joining...</span>}
                  </div>
                  <button onClick={() => { leaveMeeting(); setMeetingModalOpen(false); }} className="px-4 py-1 bg-red-600 rounded text-sm">End Meeting</button>
                </div>

                <div className="flex-1 p-4 overflow-auto">
                  {isJoiningMeeting ? (
                    <div className="h-full flex flex-col items-center justify-center">
                      <div className="animate-spin h-10 w-10 border-4 border-white border-t-transparent rounded-full mb-4"></div>
                      <p>Starting video meeting...</p>
                      <p className="text-xs text-white/60 mt-1">Allow camera and microphone access</p>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col">
                      {}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                        <div className="bg-black rounded-xl overflow-hidden relative">
                          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                          <div className="absolute bottom-2 left-2 text-xs bg-black/70 px-2 py-0.5 rounded">You</div>
                        </div>
                        <div className="bg-black rounded-xl overflow-hidden relative">
                          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                          <div className="absolute bottom-2 left-2 text-xs bg-black/70 px-2 py-0.5 rounded">{remoteUserName || "Other Party"}</div>
                        </div>
                      </div>

                      {}
                      <div className="flex justify-center gap-4 mt-4">
                        <button onClick={toggleMute} className={`px-4 py-2 rounded-full text-sm ${isMuted ? 'bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}>{isMuted ? 'Unmute' : 'Mute'}</button>
                        <button onClick={toggleVideo} className={`px-4 py-2 rounded-full text-sm ${isVideoOff ? 'bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}>{isVideoOff ? 'Show Video' : 'Hide Video'}</button>
                        <button onClick={toggleScreenShare} className={`px-4 py-2 rounded-full text-sm ${isScreenSharing ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/20'}`}>Share Screen</button>
                        <button onClick={() => { leaveMeeting(); setMeetingModalOpen(false); }} className="px-4 py-2 bg-red-600 rounded-full text-sm">Leave</button>
                      </div>

                      {}
                      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm flex-1 min-h-0">
                        <div className="border border-white/10 rounded p-3">
                          <div className="font-medium mb-2">Participants ({meetingParticipants.length})</div>
                          {meetingParticipants.map((p, i) => <div key={i} className="text-xs">• {p.fullName}</div>)}
                        </div>
                        <div className="border border-white/10 rounded p-3 flex flex-col">
                          <div className="font-medium mb-2">Chat</div>
                          <div ref={meetingChatRef} className="flex-1 overflow-auto text-xs bg-black/30 p-2 rounded mb-2">
                            {meetingChat.map((m, i) => <div key={i}><span className="text-emerald-300">{m.fullName}:</span> {m.message}</div>)}
                          </div>
                          <div className="flex gap-2">
                            <input id="meeting-chat-input" className="flex-1 bg-white/10 text-sm px-2 rounded" placeholder="Message" onKeyDown={e => e.key === 'Enter' && sendMeetingChatMessage()} />
                            <button onClick={sendMeetingChatMessage} className="bg-emerald-600 px-3 text-sm rounded">Send</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
              </div>

              <div className="flex items-center gap-2">
                {!isCallActive && (
                  <>
                    <button
                      onClick={inviteToMeeting}
                      className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                    >
                      📤 Invite / Copy Link
                    </button>
                    <button
                      onClick={joinMeeting}
                      disabled={isJoiningMeeting}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <FiVideo className="h-4 w-4" /> {isJoiningMeeting ? "Joining..." : (isMeetingInProgress ? "Join Meeting" : "Start Meeting")}
                    </button>
                  </>
                )}
                {isCallActive && (
                  <button
                    onClick={leaveMeeting}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    <FiPhoneOff className="h-4 w-4" /> End Call
                  </button>
                )}
              </div>
            </div>

            {meetingError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{meetingError}</div>
            )}

            {}
            {showMeetingUI && (
              <div className={`mt-4 rounded-2xl border bg-slate-950 p-4 text-white ${isFloating ? 'fixed bottom-4 right-4 w-96 z-[200] shadow-2xl' : ''}`}>
                <div className="flex items-center justify-between mb-3 px-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Contract Meeting</span>
                    {isJoiningMeeting ? (
                      <span className="text-yellow-400">Joining...</span>
                    ) : (
                      <span className="text-emerald-400">● Live</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setIsFloating(!isFloating)} className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20">
                      {isFloating ? "Dock" : "Float"}
                    </button>
                    <button onClick={leaveMeeting} className="text-xs px-3 py-1 rounded bg-red-600 hover:bg-red-700 flex items-center gap-1">
                      <FiPhoneOff className="h-3 w-3" /> Leave
                    </button>
                  </div>
                </div>

                {isJoiningMeeting ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-4"></div>
                    <p>Starting video meeting...</p>
                    <p className="text-xs text-white/60 mt-1">Please allow camera and microphone access</p>
                  </div>
                ) : (
                  <>
                    {}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                        <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 bg-black/60 text-xs px-2 py-0.5 rounded">You {isMuted && "(muted)"}</div>
                      </div>
                      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 bg-black/60 text-xs px-2 py-0.5 rounded">
                          {remoteUserName || "Other Party"}
                        </div>
                      </div>
                    </div>

                    {}
                    <div className="flex items-center justify-center gap-3 py-2 border-t border-white/10">
                      <button onClick={toggleMute} className={`p-3 rounded-full ${isMuted ? "bg-red-600" : "bg-white/10 hover:bg-white/20"}`}>
                        {isMuted ? <FiMicOff className="h-5 w-5" /> : <FiMic className="h-5 w-5" />}
                      </button>
                      <button onClick={toggleVideo} className={`p-3 rounded-full ${isVideoOff ? "bg-red-600" : "bg-white/10 hover:bg-white/20"}`}>
                        {isVideoOff ? <FiVideoOff className="h-5 w-5" /> : <FiVideo className="h-5 w-5" />}
                      </button>
                      <button onClick={toggleScreenShare} className={`p-3 rounded-full ${isScreenSharing ? "bg-blue-600" : "bg-white/10 hover:bg-white/20"}`}>
                        Screen
                      </button>
                      <button onClick={leaveMeeting} className="px-6 py-2 bg-red-600 rounded-full font-medium flex items-center gap-2 hover:bg-red-700">
                        <FiPhoneOff /> Leave
                      </button>
                    </div>

                    {}
                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-4 text-sm">
                      <div className="lg:col-span-2 border border-white/10 rounded-xl p-3">
                        <div className="font-medium mb-2">Participants ({meetingParticipants.length})</div>
                        <div className="max-h-28 overflow-auto space-y-1 text-xs">
                          {meetingParticipants.length === 0 && <div className="text-white/60">Waiting for others...</div>}
                          {meetingParticipants.map((p, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded">
                              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                              {p.fullName} {p.userID === user?.id && "(You)"}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="lg:col-span-3 border border-white/10 rounded-xl p-3 flex flex-col">
                        <div className="font-medium mb-2">Meeting Chat</div>
                        <div ref={meetingChatRef} className="flex-1 max-h-28 overflow-auto space-y-1 text-xs pr-1">
                          {meetingChat.length === 0 && <div className="text-white/50 italic">No messages yet</div>}
                          {meetingChat.map((msg, idx) => (
                            <div key={idx} className={msg.isMe ? "text-right" : ""}>
                              <span className="text-emerald-400 text-[10px]">{msg.fullName}:</span> {msg.message}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <input
                            id="meeting-chat-input"
                            className="flex-1 bg-white/10 text-white text-xs rounded px-2 py-1 placeholder:text-white/40"
                            placeholder="Type a message..."
                            onKeyDown={(e) => { if (e.key === "Enter") sendMeetingChatMessage(); }}
                          />
                          <button onClick={sendMeetingChatMessage} className="text-xs px-3 py-1 bg-white/20 rounded hover:bg-white/30">Send</button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          {}
          {isFreelancer && (
            <section className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Your Workspace (CMS)</h2>
                  <p className="text-xs text-slate-500">
                    Build content for the client. Looks like a course page — not a database form.
                  </p>
                </div>

                <button
                  onClick={() => setIsEditingMode(!isEditingMode)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    isEditingMode
                      ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                      : "bg-[#1a3c2e] text-white hover:bg-[#214b38]"
                  }`}
                >
                  {isEditingMode ? "Turn editing off" : "Turn editing on"}
                </button>
              </div>

              {}
              {isEditingMode && (
                <div className="mb-6">
                  <div className="text-sm font-medium text-slate-700 mb-2">Add a content block</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { type: "note", label: "Note / Update", desc: "Status update or text", icon: "📝" },
                      { type: "checklist", label: "Checklist", desc: "Task list for visibility", icon: "✅" },
                      { type: "progress", label: "Progress Report", desc: "Share recent progress", icon: "📈" },
                      { type: "links", label: "Links & Resources", desc: "Useful files or URLs", icon: "🔗" },
                    ].map((t) => (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => addContentBlock(t.type)}
                        className="flex flex-col items-start gap-1 rounded-xl border p-3 text-left hover:border-[#1a3c2e] hover:bg-slate-50 transition active:scale-[0.985]"
                      >
                        <div className="text-2xl">{t.icon}</div>
                        <div className="font-semibold text-sm">{t.label}</div>
                        <div className="text-[11px] text-slate-500 leading-tight">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {}
              {showAddSection && (
                <form id="cms-add-form" onSubmit={handleAddSection} className="mb-6 rounded-xl border bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                    <FiPlus className="h-4 w-4" /> New content block
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={newSection.title}
                      onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                      placeholder="Block title (e.g. Week 3 Progress)"
                      className="rounded border px-3 py-2 text-sm"
                      required
                    />
                    <select
                      value={newSection.type}
                      onChange={(e) => setNewSection({ ...newSection, type: e.target.value })}
                      className="rounded border px-3 py-2 text-sm"
                    >
                      <option value="note">Note / Update</option>
                      <option value="checklist">Checklist</option>
                      <option value="progress">Progress Report</option>
                      <option value="links">Links &amp; Resources</option>
                    </select>
                  </div>

                  <textarea
                    value={newSection.content}
                    onChange={(e) => setNewSection({ ...newSection, content: e.target.value })}
                    placeholder="Write your content here..."
                    className="mt-3 w-full rounded border px-3 py-2 text-sm"
                    rows={3}
                  />

                  {newSection.type === "checklist" && (
                    <div className="mt-3">
                      <div className="text-xs font-medium mb-1 text-slate-600">Checklist items</div>
                      {(newSection.items || []).map((item, idx) => (
                        <div key={idx} className="mt-1 flex gap-2">
                          <input
                            value={item.text}
                            onChange={(e) => updateChecklistItem(idx, "text", e.target.value)}
                            className="flex-1 rounded border px-2 py-1 text-sm"
                            placeholder="Task description"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setNewSection((prev) => ({
                                ...prev,
                                items: prev.items.filter((_, i) => i !== idx),
                              }))
                            }
                            className="text-red-500 px-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addChecklistItem}
                        className="mt-1 text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        + Add item
                      </button>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      type="submit"
                      className="rounded bg-emerald-700 px-5 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
                    >
                      Add to workspace
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddSection(false)}
                      className="rounded border px-4 py-1.5 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {}
              {sections.length === 0 ? (
                <p className="text-sm text-slate-500">No content yet. Turn editing on and add your first block.</p>
              ) : (
                <div className="space-y-4">
                  {sections.map((section) => {
                    const isEditing = editingSectionId === section.id;

                    return (
                      <div
                        key={section.id}
                        className={`rounded-2xl border bg-white transition ${!section.visible ? "opacity-70" : ""}`}
                      >
                        {}
                        <div className="flex items-center justify-between border-b px-4 py-2.5 bg-slate-50 rounded-t-2xl">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {section.type === "note" && "📝"}
                              {section.type === "checklist" && "✅"}
                              {section.type === "progress" && "📈"}
                              {section.type === "links" && "🔗"}
                            </span>
                            <div className="font-semibold text-slate-800">{section.title}</div>
                            {!section.visible && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Hidden</span>}
                          </div>

                          {}
                          {isEditingMode && (
                            <div className="flex items-center gap-1 text-slate-500">
                              <button
                                onClick={() => moveSection(section, "up")}
                                className="p-1 hover:text-slate-900 rounded hover:bg-white"
                                title="Move up"
                              >
                                <FiChevronUp className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => moveSection(section, "down")}
                                className="p-1 hover:text-slate-900 rounded hover:bg-white"
                                title="Move down"
                              >
                                <FiChevronDown className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => startEditSection(section)}
                                className="p-1 hover:text-slate-900 rounded hover:bg-white"
                                title="Edit"
                              >
                                <FiEdit2 className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => toggleSectionVisible(section)}
                                className="p-1 hover:text-slate-900 rounded hover:bg-white"
                                title={section.visible ? "Hide from client" : "Show to client"}
                              >
                                {section.visible ? <FiEye className="h-4 w-4" /> : <FiEyeOff className="h-4 w-4" />}
                              </button>

                              <button
                                onClick={() => handleDeleteSection(section.id)}
                                className="p-1 hover:text-red-600 rounded hover:bg-red-50"
                                title="Delete"
                              >
                                <FiTrash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {}
                        <div className="p-4">
                          {!isEditing ? (
                            <div className="text-sm text-slate-700">
                              {section.type === "checklist" && section.items?.length > 0 ? (
                                <ul className="space-y-1.5">
                                  {section.items.map((it, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <input
                                        type="checkbox"
                                        checked={!!it.done}
                                        onChange={() => isEditingMode && toggleChecklistItem(section, i)}
                                        disabled={!isEditingMode}
                                        className="mt-0.5 accent-[#1a3c2e]"
                                      />
                                      <span className={it.done ? "line-through text-slate-400" : ""}>
                                        {it.text || "(empty item)"}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="whitespace-pre-wrap leading-relaxed">
                                  {section.content || <span className="italic text-slate-400">No content added yet.</span>}
                                </div>
                              )}
                            </div>
                          ) : (

                            <div className="space-y-3">
                              <input
                                value={editSectionData.title}
                                onChange={(e) => setEditSectionData({ ...editSectionData, title: e.target.value })}
                                className="w-full rounded border px-3 py-2 text-sm font-medium"
                              />
                              <textarea
                                value={editSectionData.content}
                                onChange={(e) => setEditSectionData({ ...editSectionData, content: e.target.value })}
                                className="w-full rounded border px-3 py-2 text-sm"
                                rows={4}
                                placeholder="Content..."
                              />

                              {editSectionData.type === "checklist" && (
                                <div>
                                  <div className="text-xs mb-1 text-slate-500">Checklist items (editable)</div>
                                  {(editSectionData.items || []).map((item, idx) => (
                                    <div key={idx} className="flex gap-2 mb-1">
                                      <input
                                        value={item.text}
                                        onChange={(e) => {
                                          const newItems = [...(editSectionData.items || [])];
                                          newItems[idx] = { ...newItems[idx], text: e.target.value };
                                          setEditSectionData({ ...editSectionData, items: newItems });
                                        }}
                                        className="flex-1 text-sm border rounded px-2 py-1"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newItems = (editSectionData.items || []).filter((_, i) => i !== idx);
                                          setEditSectionData({ ...editSectionData, items: newItems });
                                        }}
                                        className="text-red-500 text-sm px-1"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newItems = [...(editSectionData.items || []), { text: "", done: false }];
                                      setEditSectionData({ ...editSectionData, items: newItems });
                                    }}
                                    className="text-xs text-blue-600 mt-1"
                                  >
                                    + Add item
                                  </button>
                                </div>
                              )}

                              <div className="flex items-center gap-3 pt-1">
                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editSectionData.visible}
                                    onChange={(e) => setEditSectionData({ ...editSectionData, visible: e.target.checked })}
                                  />
                                  Visible to client
                                </label>

                                <div className="flex-1" />

                                <button
                                  onClick={() => saveEditSection(section.id)}
                                  className="text-xs bg-[#1a3c2e] text-white px-4 py-1 rounded hover:bg-[#214b38]"
                                >
                                  Save changes
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingSectionId(null);
                                    setEditSectionData(null);
                                  }}
                                  className="text-xs border px-3 py-1 rounded"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!isEditingMode && sections.length > 0 && (
                <p className="text-[11px] text-slate-400 mt-3">Turn editing on to rearrange, edit or add new blocks.</p>
              )}
            </section>
          )}

          {}
          {!isFreelancer && sections.length > 0 && (
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-slate-900">Freelancer Updates &amp; Notes</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {sections.map((section) => (
                  <div key={section.id} className="rounded-xl border p-4">
                    <div className="mb-2 font-semibold text-slate-800">{section.title}</div>
                    <div className="text-sm text-slate-600 whitespace-pre-wrap">
                      {section.type === "checklist" && section.items?.length ? (
                        <ul>
                          {section.items.map((it, i) => (
                            <li key={i} className={it.done ? "line-through" : ""}>• {it.text}</li>
                          ))}
                        </ul>
                      ) : (
                        section.content || <span className="italic text-slate-400">No details provided.</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {isFreelancer && sections.length === 0 && !showAddSection && (
            <div className="text-center text-sm text-slate-500 mt-4">
              Use the "Add Section" button to create a dynamic workspace the client can see.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
