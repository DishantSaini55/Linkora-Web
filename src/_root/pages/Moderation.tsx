import { Loader } from "@/components/shared";
import { useMemo, useState } from "react";
import {
  useDeleteModeratedContent,
  useGetReports,
  useUpdateReport,
} from "@/lib/react-query/queries";
import { useUserContext } from "@/context/AuthContext";
import { Button } from "@/components/ui";

const Moderation = () => {
  const { data: reports = [], isLoading, isError } = useGetReports();
  const { user } = useUserContext();
  const { mutate: updateReport, isLoading: isUpdating } = useUpdateReport();
  const { mutate: deleteContent, isLoading: isDeletingContent } =
    useDeleteModeratedContent();
  const [statusFilter, setStatusFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const filteredReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          (statusFilter === "all" ||
            (report.status || "pending") === statusFilter) &&
          (targetFilter === "all" || report.targetType === targetFilter)
      ),
    [reports, statusFilter, targetFilter]
  );
  const isBusy = isUpdating || isDeletingContent;

  const markActionTaken = (reportId: string) =>
    updateReport({
      reportId,
      status: "action_taken",
      reviewedBy: user.accountId,
    });

  return (
    <div className="common-container">
      <div className="w-full max-w-5xl">
        <p className="eyebrow">TRUST & SAFETY</p>
        <h1 className="h2-bold mt-2">Moderation queue</h1>
        <p className="text-light-3 mt-2">
          Review reports using the read permissions configured in Appwrite.
        </p>
      </div>
      {isLoading ? (
        <Loader />
      ) : isError ? (
        <p className="text-light-3">
          You do not have permission to view reports, or the Reports table is
          not configured.
        </p>
      ) : (
        <>
        <div className="w-full max-w-5xl flex flex-wrap gap-3">
          <select
            aria-label="Filter reports by status"
            className="rounded-lg bg-dark-4 px-3 py-2 text-light-1"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="dismissed">Dismissed</option>
            <option value="action_taken">Action taken</option>
          </select>
          <select
            aria-label="Filter reports by target type"
            className="rounded-lg bg-dark-4 px-3 py-2 text-light-1"
            value={targetFilter}
            onChange={(event) => setTargetFilter(event.target.value)}>
            <option value="all">Posts and comments</option>
            <option value="post">Posts</option>
            <option value="comment">Comments</option>
          </select>
        </div>
        <ul className="w-full max-w-5xl flex flex-col gap-3">
          {!filteredReports.length ? (
            <li className="settings-card">
              <p className="body-medium">
                {reports.length ? "No reports match these filters." : "No reports to review."}
              </p>
              <p className="small-regular text-light-3 mt-2">
                Reports submitted by users will appear here when the Reports
                table contains records.
              </p>
            </li>
          ) : null}
          {filteredReports.map((report) => (
            <li key={report.$id} className="settings-card">
              <div className="flex-between">
                <span className="small-semibold text-primary-400">
                  Reported {report.targetType}
                </span>
                <span className="subtle-regular text-light-4">
                  {new Date(report.$createdAt).toLocaleString()}
                </span>
              </div>
              <p className="small-regular text-light-4 mt-2">
                Status: {report.status || "pending"}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="small-semibold text-light-3">Reported by</p>
                  <p className="body-medium mt-1">
                    {report.reporterProfile?.name ||
                      report.reporterProfile?.username ||
                      "Unknown user"}
                  </p>
                  <p className="small-regular text-light-4">
                    Account ID: {report.reporter}
                  </p>
                </div>
                <div>
                  <p className="small-semibold text-light-3">Reason</p>
                  <p className="body-medium mt-1">{report.reason}</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-dark-4 bg-dark-4/30 p-3">
                <p className="small-semibold text-light-3">
                  Reported {report.targetType}
                </p>
                {report.targetDetails?.post ? (
                  <>
                    <p className="body-medium mt-1">
                      {report.targetDetails.post.caption}
                    </p>
                    <p className="small-regular text-light-4 mt-1">
                      Posted by{" "}
                      {report.targetDetails.post.creator?.name ||
                        report.targetDetails.post.creator?.username ||
                        "Unknown user"}
                    </p>
                  </>
                ) : (
                  <p className="small-regular text-light-4 mt-1">
                    Post details unavailable
                  </p>
                )}
                {report.targetDetails?.comment ? (
                  <p className="small-regular text-light-3 mt-2">
                    Comment: {report.targetDetails.comment.content}
                  </p>
                ) : null}
                <p className="small-regular text-light-4 mt-2">
                  Post ID: {report.targetDetails?.post?.$id || report.targetId}
                </p>
              </div>
              {report.detailsError ? (
                <p className="small-regular text-orange-300 mt-3">
                  {report.detailsError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 mt-4">
                {(["reviewed", "dismissed", "action_taken"] as const).map(
                  (status) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant={status === "action_taken" ? "default" : "ghost"}
                      disabled={isBusy}
                      onClick={() =>
                        updateReport({
                          reportId: report.$id,
                          status,
                          reviewedBy: user.accountId,
                        })
                      }>
                      {status.replace("_", " ")}
                    </Button>
                  )
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={isBusy}
                  onClick={() => {
                    if (!window.confirm("Delete this reported content?")) return;
                    if (report.targetType === "post") {
                      deleteContent(
                        {
                          targetType: "post",
                          targetId: report.targetDetails?.post?.$id || report.targetId,
                          reportId: report.$id,
                        },
                        { onSuccess: () => markActionTaken(report.$id) }
                      );
                    } else {
                      deleteContent(
                        {
                          targetType: "comment",
                          targetId: report.targetId,
                          reportId: report.$id,
                        },
                        {
                        onSuccess: () => markActionTaken(report.$id),
                        }
                      );
                    }
                  }}>
                  Delete reported content
                </Button>
              </div>
            </li>
          ))}
        </ul>
        </>
      )}
    </div>
  );
};

export default Moderation;
