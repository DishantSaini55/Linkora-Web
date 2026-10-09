import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Button, Textarea } from "@/components/ui";
import { Loader } from "@/components/shared";
import { useUserContext } from "@/context/AuthContext";
import { getUserImageUrl } from "@/lib/appwrite/api";
import {
  useCreateMessage,
  useGetMessages,
  useGetUserById,
  useGetUsers,
  useMarkMessageRead,
} from "@/lib/react-query/queries";
import { useToast } from "@/components/ui/use-toast";
import { isMessagesConfigured } from "@/lib/appwrite/config";
import { isUserBlocked } from "@/lib/clientPreferences";

const Messages = () => {
  const { user } = useUserContext();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: messages = [], isLoading } = useGetMessages(user.id);
  const { data: users } = useGetUsers();
  const { data: selectedUser } = useGetUserById(userId || "");
  const { mutate: createMessage, isLoading: isSending } = useCreateMessage();
  const { mutate: markMessageRead } = useMarkMessageRead();
  const [content, setContent] = useState("");

  const conversations = useMemo(() => {
    const participantIds = new Set<string>();
    messages.forEach((message) => {
      participantIds.add(
        message.sender === user.id ? message.recipient : message.sender
      );
    });
    return Array.from(participantIds)
      .map((id) => ({
        participant: users?.documents.find((candidate) => candidate.$id === id),
        lastMessage: [...messages]
          .reverse()
          .find(
            (message) => message.sender === id || message.recipient === id
          ),
      }))
      .filter((conversation) => conversation.participant);
  }, [messages, user.id, users]);

  const thread = useMemo(
    () =>
      messages.filter(
        (message) =>
          message.sender === userId || message.recipient === userId
      ),
    [messages, userId]
  );

  useEffect(() => {
    thread
      .filter((message) => message.recipient === user.id && !message.read)
      .forEach((message) => markMessageRead(message.$id));
  }, [markMessageRead, thread, user.id]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || !selectedUser) return;
    if (isUserBlocked(selectedUser.$id)) {
      toast({
        title: "Message blocked",
        description: "You cannot message a user you have blocked.",
        variant: "destructive",
      });
      return;
    }
    if (!user.accountId || !selectedUser.accountId) {
      toast({
        title: "Message unavailable",
        description: "This profile is missing a valid Appwrite account ID.",
        variant: "destructive",
      });
      return;
    }
    createMessage(
      {
        sender: user.id,
        senderAccountId: user.accountId,
        recipient: selectedUser.$id,
        recipientAccountId: selectedUser.accountId,
        content: trimmed,
      },
      {
        onSuccess: () => setContent(""),
        onError: (error) =>
          toast({
            title: "Message failed",
            description:
              error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          }),
      }
    );
  };

  return (
    <div className="common-container">
      <div className="w-full max-w-6xl">
        <p className="eyebrow">PRIVATE CONVERSATIONS</p>
        <h1 className="h2-bold mt-2">Messages</h1>
        <p className="text-light-3 mt-2">
          Send private messages to people in your Linkora community.
        </p>
      </div>

      {!isMessagesConfigured && (
        <div className="settings-card mt-6 w-full max-w-6xl border border-amber-500/40">
          <p className="body-bold text-amber-300">Messaging is not configured</p>
          <p className="text-light-3 mt-2">
            Add VITE_APPWRITE_MESSAGES_COLLECTION_ID to .env.local and restart
            the development server.
          </p>
        </div>
      )}

      <div className="mt-8 grid w-full max-w-6xl gap-5 lg:grid-cols-[280px_1fr]">
        <section className="settings-card h-fit">
          <div className="flex items-center justify-between">
            <h2 className="body-bold">Conversations</h2>
            <Link to="/all-users" className="small-regular text-primary-500">
              New message
            </Link>
          </div>
          {isLoading ? (
            <Loader />
          ) : !conversations.length ? (
            <p className="text-light-3 mt-5">No conversations yet.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {conversations.map(({ participant, lastMessage }) => (
                <Link
                  key={participant!.$id}
                  to={`/messages/${participant!.$id}`}
                  className={`flex items-center gap-3 rounded-xl p-3 ${
                    participant!.$id === userId
                      ? "bg-dark-3"
                      : "hover:bg-dark-4"
                  }`}>
                  <img
                    src={getUserImageUrl(participant!)}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <span className="min-w-0">
                    <strong className="block truncate">{participant!.name}</strong>
                    <small className="block truncate text-light-3">
                      {lastMessage?.content}
                    </small>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="settings-card flex min-h-[520px] flex-col">
          {!userId || !selectedUser ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="body-bold">Choose a conversation</p>
              <p className="text-light-3 mt-2">
                Select a conversation or start a new message.
              </p>
              <Button
                className="shad-button_primary mt-5"
                onClick={() => navigate("/all-users")}>
                Find people
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-dark-4 pb-4">
                <img
                  src={getUserImageUrl(selectedUser)}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <Link
                    to={`/profile/${selectedUser.$id}`}
                    className="body-bold hover:text-primary-500">
                    {selectedUser.name}
                  </Link>
                  <p className="small-regular text-light-3">
                    @{selectedUser.username}
                  </p>
                </div>
              </div>
              <div className="custom-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto py-5">
                {!thread.length ? (
                  <p className="m-auto text-light-3">
                    Start the conversation.
                  </p>
                ) : (
                  thread.map((message) => (
                    <div
                      key={message.$id}
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.sender === user.id
                          ? "self-end bg-primary-500 text-white"
                          : "self-start bg-dark-4 text-light-1"
                      }`}>
                      <p className="whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                      <small className="mt-1 block opacity-70">
                        {new Date(message.$createdAt).toLocaleString()}
                      </small>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleSubmit} className="flex gap-3 border-t border-dark-4 pt-4">
                <Textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Write a message..."
                  maxLength={2000}
                  className="min-h-[48px] resize-none bg-dark-4"
                  aria-label="Message"
                />
                <Button
                  type="submit"
                  className="shad-button_primary self-end"
                  disabled={isSending || !content.trim()}>
                  Send
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Messages;
