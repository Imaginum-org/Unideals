import userdp from "/userdp.png";

const ChatCard = ({ user, onClick, isSelected }) => {
  return (
    <div
      onClick={() => onClick(user)}
      className={`flex items-center gap-3 p-3 w-full cursor-pointer rounded-xl transition-all duration-200 ease-out font-roboto mb-1
        ${
          isSelected
            ? "bg-[#394ff1]/10 border border-[#394ff1]/20 shadow-sm"
            : "hover:bg-gray-100 dark:hover:bg-[#1A1D20] border border-transparent"
        }`}
    >
      <div className="relative shrink-0">
        <img
          src={user.url || userdp}
          alt={user.name}
          className="size-11 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
        />
        <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white dark:border-[#111214] rounded-full"></div>
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <h1 className="font-medium text-sm truncate dark:text-white">
            {user.name}
          </h1>
          <span className="text-[10px] text-gray-400 dark:text-zinc-500">
            19:44
          </span>
        </div>
        <div className="flex justify-between items-center">
          <h3 className="text-xs text-gray-500 dark:text-zinc-400 truncate pr-2">
            Hey, tell me your final price.
          </h3>
          <div className="size-2 bg-[#394ff1] rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default ChatCard;
