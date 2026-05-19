import { useUser } from "../../../context/useUserContext.jsx";
import LegalDocument from "../../legal/components/LegalDocuments.jsx";
import Profile_left_part from "../components/Profile_left_part.jsx";

function Termscondition() {
  const { userDetails } = useUser();

  return (
    <div className="min-h-[calc(100vh-70px)] overflow-hidden bg-white dark:bg-[#131313]">
      <div className="flex min-h-[calc(100vh-70px)]">
        {userDetails?._id ? (
          <div className="hidden bg-[#FBFBFB] pb-[2vh] pl-[2vw] pr-[1.75vw] pt-[3.5vh] dark:bg-[#131313] md:block md:w-[37%] lg:w-[28%] xl:-mr-4 xl:w-[26%] xl:pb-0 xl:pt-[2.5vh]">
            <Profile_left_part />
          </div>
        ) : null}

        <div
          className={`relative overflow-y-auto bg-white dark:bg-[#131313] ${
            userDetails?._id
              ? "md:w-[65%] lg:w-[72%]"
              : "mx-auto w-full max-w-6xl"
          }`}
        >
          <div className="mx-[5.5vw] md:ml-[2vw] md:mr-[3vw] md:mt-[4vh] lg:ml-[1.8vw] lg:mr-[3.6vw]">
            <LegalDocument type="terms" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Termscondition;
