import { useCallback, useState } from "react";
import { FileWithPath, useDropzone } from "react-dropzone";

import { convertFileToUrl } from "@/lib/utils";

type ProfileUploaderProps = {
  fieldChange: (files: File[]) => void;
  mediaUrl: string;
  onRemove: () => void;
};

const ProfileUploader = ({ fieldChange, mediaUrl, onRemove }: ProfileUploaderProps) => {
  const [fileUrl, setFileUrl] = useState<string>(mediaUrl);
  const [error, setError] = useState("");

  const onDrop = useCallback(
    (acceptedFiles: FileWithPath[]) => {
      const selectedFile = acceptedFiles[0];
      if (!selectedFile) return;
      setError("");
      fieldChange(acceptedFiles);
      setFileUrl(convertFileToUrl(selectedFile));
    },
    [fieldChange]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDropRejected: (rejections) => {
      setError(
        rejections[0]?.errors[0]?.message ||
          "Choose a PNG, JPG, or JPEG image up to 10 MB."
      );
    },
    accept: {
      "image/*": [".png", ".jpeg", ".jpg"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} className="cursor-pointer" />

      <div className="cursor-pointer flex-center gap-4">
        <img
          src={fileUrl || "/assets/icons/profile-placeholder.svg"}
          alt="image"
          className="h-24 w-24 rounded-full object-cover object-top"
        />
        <div className="flex flex-col gap-2">
          <p className="text-primary-500 small-regular md:bbase-semibold">
            Choose a new profile photo
          </p>
          <p className="small-regular text-light-3">
            PNG, JPG, or JPEG up to 10 MB
          </p>
          <button
            type="button"
            className="text-left small-regular text-light-3 hover:text-light-1"
            onClick={(event) => {
              event.stopPropagation();
              setFileUrl("/assets/icons/profile-placeholder.svg");
              fieldChange([]);
              onRemove();
            }}>
            Remove photo
          </button>
        </div>
      </div>
      {error && <p className="small-regular text-red-400 mt-2">{error}</p>}
    </div>
  );
};

export default ProfileUploader;
