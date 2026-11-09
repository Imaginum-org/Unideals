import LegalDocument from "../components/LegalDocuments.jsx";

function PrivacyPolicy() {
  return (
    <div className="min-h-[calc(100dvh-var(--header-h)-var(--tabbar-h))] bg-[#F7F8FA] dark:bg-[#131313]">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-6 lg:py-8">
        <LegalDocument initialType="privacy" syncUrl />
      </div>
    </div>
  );
}

export default PrivacyPolicy;
