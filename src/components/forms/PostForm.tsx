import * as z from "zod";
import { Models } from "appwrite";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Button,
  Input,
  Textarea,
} from "@/components/ui";
import { PostValidation } from "@/lib/validation";
import { useToast } from "@/components/ui/use-toast";
import { useUserContext } from "@/context/AuthContext";
import { FileUploader, Loader } from "@/components/shared";
import {
  useCreatePost,
  useUpdatePost,
  useSaveDraft,
  useGetDrafts,
  useDeleteDraft,
  useGenerateAiContent,
} from "@/lib/react-query/queries";
import { isDraftsConfigured } from "@/lib/appwrite/config";
import { uploadFile, getFilePreview } from "@/lib/appwrite/api";

type PostFormProps = {
  post?: Models.Document;
  action: "Create" | "Update";
};

const PostForm = ({ post, action }: PostFormProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useUserContext();
  const selectedDraft = (location.state as { draft?: Models.Document } | null)
    ?.draft;
  const selectedDraftId = selectedDraft?.$id;
  const [savedCloudImageUrl, setSavedCloudImageUrl] = useState<string>();
  const draftKey = `linkora:post-draft:${user.id}`;
  const savedDraft = (() => {
    if (action !== "Create" || post) return null;
    try {
      return JSON.parse(localStorage.getItem(draftKey) || "null");
    } catch {
      localStorage.removeItem(draftKey);
      return null;
    }
  })();
  const form = useForm<z.infer<typeof PostValidation>>({
    resolver: zodResolver(PostValidation),
    defaultValues: {
      caption:
        post?.caption || selectedDraft?.caption || savedDraft?.caption || "",
      file: [],
      location:
        post?.location ||
        selectedDraft?.location ||
        savedDraft?.location ||
        "",
      tags: post
        ? (Array.isArray(post.tags) ? post.tags : []).join(",")
        : selectedDraft?.tags || savedDraft?.tags || "",
    },
  });
  const watchedValues = form.watch();
  const { mutateAsync: generateAiContent, isLoading: isGeneratingAi } =
    useGenerateAiContent();
  const [aiTopic, setAiTopic] = useState("");
  const [aiTone, setAiTone] = useState<
    "casual" | "professional" | "funny" | "inspirational" | "educational"
  >("casual");
  const [aiLength, setAiLength] = useState<"short" | "medium" | "long">(
    "medium"
  );
  const [aiResult, setAiResult] = useState<{
    caption: string;
    alternativeCaption: string;
    hashtags: string[];
  }>();

  useEffect(() => {
    if (action === "Create" && !post) {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          caption: watchedValues.caption,
          location: watchedValues.location,
          tags: watchedValues.tags,
        })
      );
    }
  }, [
    action,
    draftKey,
    post,
    watchedValues.caption,
    watchedValues.location,
    watchedValues.tags,
  ]);

  const clearDraft = () => {
    localStorage.removeItem(draftKey);
    form.reset({ caption: "", file: [], location: "", tags: "" });
    toast({ title: "Draft cleared" });
  };

  // Query
  const { mutateAsync: createPost, isLoading: isLoadingCreate } =
    useCreatePost();
  const { mutateAsync: updatePost, isLoading: isLoadingUpdate } =
    useUpdatePost();
  const { mutateAsync: saveDraft, isLoading: isSavingDraft } = useSaveDraft();
  const { mutateAsync: deleteDraft } = useDeleteDraft();
  const { data: cloudDrafts } = useGetDrafts(
    action === "Create" && !post ? user.id : undefined
  );

  useEffect(() => {
    const latestDraft = cloudDrafts?.[0];
    if (
      action === "Create" &&
      !post &&
      !selectedDraft &&
      latestDraft &&
      !form.formState.isDirty
    ) {
      form.reset({
        caption: latestDraft.caption || "",
        file: [],
        location: latestDraft.location || "",
        tags: latestDraft.tags || "",
      });
    }
  }, [action, cloudDrafts, form, post, selectedDraft]);

  const handleSaveCloudDraft = async () => {
    try {
      const selectedFile = form.getValues("file")?.[0];
      let imageId = selectedDraft?.imageId;
      let imageUrl = selectedDraft?.imageUrl;

      if (selectedFile) {
        const uploadedFile = await uploadFile(selectedFile);
        imageId = uploadedFile.$id;
        imageUrl = getFilePreview(uploadedFile.$id).toString();
        setSavedCloudImageUrl(imageUrl);
      }

      await saveDraft({
        owner: user.id,
        ownerAccountId: user.accountId,
        draftId: selectedDraftId,
        draft: {
          caption: form.getValues("caption"),
          location: form.getValues("location"),
          tags: form.getValues("tags"),
          imageId,
          imageUrl,
        },
      });
      toast({
        title: "Draft saved",
        description: "Your draft is synced to Appwrite.",
      });
    } catch (error) {
      toast({
        title: "Cloud draft failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateCaption = async () => {
    const topic = aiTopic.trim();
    if (!topic || topic.length > 500) {
      toast({
        title: "Add a short topic first",
        description: "Enter between 1 and 500 characters.",
        variant: "destructive",
      });
      return;
    }
    try {
      const result = await generateAiContent({
        action: "generate-caption",
        topic,
        tone: aiTone,
        length: aiLength,
      });
      if (
        typeof result.caption !== "string" ||
        typeof result.alternativeCaption !== "string"
      ) {
        throw new Error("The AI response was incomplete.");
      }
      setAiResult({
        caption: result.caption,
        alternativeCaption: result.alternativeCaption,
        hashtags: result.hashtags || [],
      });
    } catch (error) {
      toast({
        title: "AI generation failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateHashtags = async () => {
    const topic = (aiTopic.trim() || form.getValues("caption").trim()).trim();
    if (!topic) {
      toast({
        title: "Add a topic or caption first",
        description: "Hashtags need some post context.",
        variant: "destructive",
      });
      return;
    }
    try {
      const result = await generateAiContent({
        action: "generate-hashtags",
        topic,
        tone: aiTone,
        length: aiLength,
      });
      setAiResult((current) => ({
        caption: current?.caption || form.getValues("caption"),
        alternativeCaption: current?.alternativeCaption || "",
        hashtags: result.hashtags || [],
      }));
    } catch (error) {
      toast({
        title: "Hashtag generation failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handler
  const handleSubmit = async (value: z.infer<typeof PostValidation>) => {
    // ACTION = UPDATE
    if (post && action === "Update") {
      try {
        await updatePost({
          ...value,
          postId: post.$id,
          imageId: post.imageid,
          imageUrl: post.imageUrl,
        });
      } catch (error) {
        toast({
          title: "Update post failed",
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred.",
          variant: "destructive",
        });
        return;
      }

      return navigate(`/posts/${post.$id}`);
    }

    // ACTION = CREATE
    try {
      const newPost = await createPost({
        ...value,
        userId: user.id,
      });

      if (!newPost) throw new Error("Appwrite did not create the post.");

      if (selectedDraftId) {
        await deleteDraft(selectedDraftId);
      }
      navigate("/");
      localStorage.removeItem(draftKey);
    } catch (error) {
      toast({
        title: "Create post failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-9 w-full  max-w-5xl">
        {action === "Create" && (
          <section className="settings-card flex flex-col gap-4">
            <div>
              <p className="body-bold">AI caption assistant</p>
              <p className="small-regular mt-1 text-light-3">
                Generate ideas, review them, and insert only what you want.
              </p>
            </div>
            <Input
              value={aiTopic}
              onChange={(event) => setAiTopic(event.target.value)}
              maxLength={500}
              placeholder="Describe your post topic..."
              aria-label="Post topic for AI assistant"
              className="shad-input"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="small-regular text-light-3">
                Tone
                <select
                  value={aiTone}
                  onChange={(event) =>
                    setAiTone(
                      event.target.value as
                        | "casual"
                        | "professional"
                        | "funny"
                        | "inspirational"
                        | "educational"
                    )
                  }
                  className="shad-input mt-2 w-full">
                  <option value="casual">Casual</option>
                  <option value="professional">Professional</option>
                  <option value="funny">Funny</option>
                  <option value="inspirational">Inspirational</option>
                  <option value="educational">Educational</option>
                </select>
              </label>
              <label className="small-regular text-light-3">
                Length
                <select
                  value={aiLength}
                  onChange={(event) =>
                    setAiLength(event.target.value as "short" | "medium" | "long")
                  }
                  className="shad-input mt-2 w-full">
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                className="shad-button_primary"
                disabled={isGeneratingAi}
                onClick={handleGenerateCaption}>
                {isGeneratingAi ? "Generating..." : "Generate caption"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isGeneratingAi}
                onClick={handleRegenerateHashtags}>
                Regenerate hashtags
              </Button>
            </div>
            {aiResult && (
              <div className="rounded-xl border border-dark-4 bg-dark-4/50 p-4">
                <p className="small-regular whitespace-pre-wrap text-light-1">
                  {aiResult.caption}
                </p>
                {aiResult.alternativeCaption && (
                  <p className="small-regular mt-3 whitespace-pre-wrap text-light-3">
                    Alternative: {aiResult.alternativeCaption}
                  </p>
                )}
                <p className="small-regular mt-3 text-primary-400">
                  {aiResult.hashtags.join(" ")}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      form.setValue("caption", aiResult.caption, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      form.setValue("tags", aiResult.hashtags.join(", "), {
                        shouldDirty: true,
                      });
                    }}>
                    Insert caption and hashtags
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(aiResult.caption)
                        .then(() =>
                          toast({ title: "Caption copied to clipboard" })
                        )
                        .catch(() =>
                          toast({
                            title: "Copy failed",
                            description: "Select and copy the caption manually.",
                            variant: "destructive",
                          })
                        )
                    }>
                    Copy caption
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}
        <FormField
          control={form.control}
          name="caption"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="shad-form_label">Caption</FormLabel>
              <FormControl>
                <Textarea
                  className="shad-textarea custom-scrollbar"
                  {...field}
                />
              </FormControl>
              <FormMessage className="shad-form_message" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="file"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="shad-form_label">Add Photos</FormLabel>
              <FormControl>
                <FileUploader
                  fieldChange={field.onChange}
                  mediaUrl={
                    post?.imageUrl ||
                    selectedDraft?.imageUrl ||
                    savedCloudImageUrl ||
                    cloudDrafts?.[0]?.imageUrl
                  }
                />
              </FormControl>
              <FormMessage className="shad-form_message" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="shad-form_label">Add Location</FormLabel>
              <FormControl>
                <Input type="text" className="shad-input" {...field} />
              </FormControl>
              <FormMessage className="shad-form_message" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="shad-form_label">
                Add Tags (separated by comma &quot;,&quot;)
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Art, Expression, Learn"
                  type="text"
                  className="shad-input"
                  {...field}
                />
              </FormControl>
              <FormMessage className="shad-form_message" />
            </FormItem>
          )}
        />

        <div className="flex gap-4 items-center justify-end">
          <Button
            type="button"
            className="shad-button_dark_4"
            onClick={() => navigate(-1)}>
            Cancel
          </Button>
          {action === "Create" && (
            <Button
              type="button"
              variant="ghost"
              aria-label="Clear saved post draft"
              onClick={clearDraft}>
              Clear draft
            </Button>
          )}
          {action === "Create" && isDraftsConfigured && (
            <Button
              type="button"
              variant="ghost"
              disabled={isSavingDraft}
              onClick={handleSaveCloudDraft}>
              {isSavingDraft ? "Saving..." : "Save to cloud"}
            </Button>
          )}
          <Button
            type="submit"
            className="shad-button_primary whitespace-nowrap"
            disabled={isLoadingCreate || isLoadingUpdate}>
            {(isLoadingCreate || isLoadingUpdate) && <Loader />}
            {action} Post
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PostForm;
