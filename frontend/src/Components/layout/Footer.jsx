import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowRight, FiShare2 } from "react-icons/fi";
import { FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const Footer = () => {
  const cols = [
    ["MARKETPLACE", "Sell Now", "Chats", "My Orders", "Setting", "My Listing"],
    ["COMPANY", "Imaginum", "Linkedin", "Careers", "Blogs", "New Releases"],
    ["SUPPORT", "Contact us", "Report a bug", "Suggest a feature", "FAQ"],
  ];

  return (
    <footer className="w-full overflow-hidden bg-[radial-gradient(circle_at_15%_85%,#7c3cff_0,#1737ff_32%,#050047_72%)] px-3 pt-5 font-poppins">
      <div className="rounded-[28px] bg-white px-8 py-10 text-[#5d6068] shadow-2xl md:px-14 lg:px-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link
              to="/"
              className="mb-7 flex items-center gap-3 text-2xl font-bold text-black"
            >
              <img
                src="/whitebag.png"
                alt="Unideals"
                className="h-7 w-7 rounded bg-indigo-600 p-1"
              />
              Unideals
            </Link>

            <p className="mb-7 max-w-[230px] leading-7">
              Your campus connection for buying, selling, and trading.
            </p>

            <h3 className="mb-4 font-bold text-[#4c4f58]">STAY IN THE LOOP</h3>
            <form className="mb-6 flex max-w-[330px] gap-2">
              <input
                type="email"
                placeholder="Drop you mail"
                className="min-w-0 flex-1 rounded-xl bg-[#f1f2f6] px-5 py-3 outline-none placeholder:text-[#b8bcc6]"
              />
              <button className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-600 text-xl text-white">
                <FiArrowRight />
              </button>
            </form>

            <div className="flex gap-3">
              {[FaXTwitter, FaInstagram, FaLinkedinIn].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-10 w-10 place-items-center rounded-lg bg-[#f4f5f8] text-lg text-[#6f737c]"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {cols.map(([title, ...links]) => (
            <div key={title}>
              <h3 className="mb-6 font-bold text-[#4c4f58]">{title}</h3>
              <ul className="space-y-4">
                {links.map((text) => (
                  <li key={text}>
                    <Link to="/" className="hover:text-indigo-600">
                      {text}
                    </Link>
                  </li>
                ))}
                {title === "SUPPORT" && (
                  <li>
                    <a
                      href="mailto:unideals@gmail.com"
                      className="font-medium text-indigo-500"
                    >
                      unideals@gmail.com
                    </a>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-20 flex flex-col gap-5 border-t border-gray-100 pt-8 text-sm text-[#b6bbc4] md:flex-row md:items-center md:justify-between">
          <p>© 2026 Unideals.in All rights reserved.</p>

          <div className="flex items-center gap-7">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <button className="flex items-center gap-2 rounded-full border border-indigo-300 px-5 py-2 font-medium text-[#7d7fb0]">
              <FiShare2 /> Share Unideals
            </button>
          </div>
        </div>
      </div>

      <motion.h2
        initial={{ y: 28, opacity: 0.85 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        viewport={{ amount: 0.45 }}
        className="pointer-events-none select-none text-center text-[15.3vw] font-bold leading-none text-white/55"
      >
        unideals
      </motion.h2>
    </footer>
  );
};

export default Footer;
