import { useUser } from "../../../context/useUserContext.jsx";
import LegalDocument from "../../legal/components/LegalDocuments.jsx";
import { AccountLayout } from "../components/account/AccountKit.jsx";

// Signed in: inside the account shell. Signed out: plain page (the account
// sidebar would bounce guests to /login, and legal pages must stay public).
function Termscondition() {
  const { userDetails } = useUser();

  if (userDetails?._id) {
    return (
      <AccountLayout seoTitle="Terms & privacy | Unideals" mobileTitle="Terms & privacy" width="xl" bare>
        <LegalDocument initialType="privacy" syncUrl />
      </AccountLayout>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-var(--header-h)-var(--tabbar-h))] w-full bg-[#F7F9FD] font-figtree dark:bg-[#131313]">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-6 lg:py-8">
        <LegalDocument initialType="privacy" syncUrl />
      </div>
    </div>
  );
}

export default Termscondition;
