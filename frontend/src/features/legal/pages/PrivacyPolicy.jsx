import LegalDocument from "../components/LegalDocuments.jsx";

function PrivacyPolicy() {
  return (
    <div className="min-h-[calc(100vh-70px)] bg-white dark:bg-[#131313]">
      <div className="mx-auto w-full max-w-6xl px-[5.5vw] py-[4vh] md:px-[3vw]">
        <LegalDocument type="privacy" />
      </div>
    </div>
  );
}

export default PrivacyPolicy;
