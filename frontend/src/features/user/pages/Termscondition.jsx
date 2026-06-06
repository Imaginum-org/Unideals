import { useUser } from "../../../context/useUserContext.jsx";
import LegalDocument from "../../legal/components/LegalDocuments.jsx";
import Profile_left_part from "../components/Profile_left_part.jsx";

function Termscondition() {
  const { userDetails } = useUser();

  return (
    <div className="h-screen w-full dark:bg-[#131313] flex flex-col bg-[#F7F9FD] font-figtree">
      <div className="flex-1 lg:flex md:flex overflow-hidden">
        {/* LEFT PANEL - Only render if user exists */}
        {userDetails?._id ? (
          <div className="hidden md:block md:w-[22.5%] lg:w-[21%] xl:w-[20.5%] 2xl:w-[20.5%] bg-[#FFFFFF] dark:bg-[#131313] xl:pt-2  xl:pb-0">
            <Profile_left_part />
          </div>
        ) : null}

        {/* RIGHT PANEL (Main Content Area) */}
        <div
          className={`h-full overflow-y-auto no-scrollbar bg-[#F7F9FD] dark:bg-[#131313] p-6 lg:px-[5.7rem] lg:py-6 ${
            userDetails?._id
              ? "w-full md:w-[77.5%] lg:w-[79%] xl:w-[79.5%]"
              : "mx-auto w-full max-w-5xl"
          }`}
        >
          {/* Centered container to match other pages */}
          <div className="max-w-4xl mx-auto  ">
            <LegalDocument initialType="privacy" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Termscondition;
