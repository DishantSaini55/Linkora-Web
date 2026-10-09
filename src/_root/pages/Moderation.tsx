import { Loader } from "@/components/shared";
import { useGetReports } from "@/lib/react-query/queries";

const Moderation = () => {
  const { data: reports = [], isLoading, isError } = useGetReports();

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
        <ul className="w-full max-w-5xl flex flex-col gap-3">
          {reports.map((report) => (
            <li key={report.$id} className="settings-card">
              <div className="flex-between">
                <span className="small-semibold text-primary-400">
                  {report.targetType}
                </span>
                <span className="subtle-regular text-light-4">
                  {new Date(report.$createdAt).toLocaleString()}
                </span>
              </div>
              <p className="body-medium mt-3">{report.reason}</p>
              <p className="small-regular text-light-4 mt-2">
                Target: {report.targetId}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Moderation;
