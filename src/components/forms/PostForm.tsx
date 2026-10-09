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
