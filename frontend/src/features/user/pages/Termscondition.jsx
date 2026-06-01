import { useUser } from "../../../context/useUserContext.jsx";
import LegalDocument from "../../legal/components/LegalDocuments.jsx";
import Profile_left_part from "../components/Profile_left_part.jsx";

function Termscondition() {
  const { userDetails } = useUser();

  return (
    <div className="h-screen w-full dark:bg-[#131313] flex flex-col font-poppins">
      <div className="flex-1 lg:flex md:flex overflow-hidden">
        
        {/* LEFT PANEL - Only render if user exists */}
        {userDetails?._id ? (
          <div className="hidden md:block md:w-[37%] lg:w-[28%] xl:w-[26%] pt-[3.5vh] pl-[2vw] pr-[1.75vw] pb-[2vh] bg-[#FBFBFB] dark:bg-[#131313] xl:pt-[2.5vh] xl:-mr-4 xl:pb-0">
            <Profile_left_part />
          </div>
        ) : null}

        {/* RIGHT PANEL (Main Content Area) */}
        <div
          className={`h-full overflow-y-auto no-scrollbar bg-[#FBFBFB] dark:bg-[#131313] p-6 lg:p-10 ${
            userDetails?._id
              ? "w-full md:w-[63%] lg:w-[72%] xl:w-[73.5%]"
              : "mx-auto w-full max-w-5xl"
          }`}
        >
          {/* Centered container to match other pages */}
          <div className="max-w-4xl mx-auto pb-10">
            <LegalDocument initialType="privacy" />
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default Termscondition;