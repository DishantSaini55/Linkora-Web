import * as z from "zod";
import { Models } from "appwrite";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
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
} from "@/lib/react-query/queries";
import { isDraftsConfigured } from "@/lib/appwrite/config";

type PostFormProps = {
  post?: Models.Document;
  action: "Create" | "Update";
};

const PostForm = ({ post, action }: PostFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUserContext();
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
      caption: post ? post?.caption : savedDraft?.caption || "",
      file: [],
      location: post ? post.location : savedDraft?.location || "",
      tags: post
        ? (Array.isArray(post.tags) ? post.tags : []).join(",")
        : savedDraft?.tags || "",
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
  const { data: cloudDrafts } = useGetDrafts(
    action === "Create" && !post ? user.id : undefined
  );

  useEffect(() => {
    const latestDraft = cloudDrafts?.[0];
    if (
      action === "Create" &&
      !post &&
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
  }, [action, cloudDrafts, form, post]);

  const handleSaveCloudDraft = async () => {
    try {
      await saveDraft({
        owner: user.id,
        draft: {
          caption: form.getValues("caption"),
          location: form.getValues("location"),
          tags: form.getValues("tags"),
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
                  mediaUrl={post?.imageUrl}
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
