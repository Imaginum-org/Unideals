import React from "react";
import { FaInstagram, FaLinkedin, FaHeart } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="w-full bg-gradient-to-bl from-indigo-600 to-blue-600 dark:bg-none dark:bg-zinc-900 px-[4.5vw] pt-10 lg:pt-[2vw] relative text-white font-poppins overflow-hidden">
      {/* Decorative Circles */}
      <img
        src="/assets/circle45.png"
        alt="circle"
        className="absolute hidden md:block bottom-[-2vh] left-60 w-[250px]"
      />
      <img
        src="/assets/footer_circle.png"
        alt="circle"
        className="absolute hidden md:block top-[-2vh] right-[-3vh] w-[250px]"
      />

      {/* Top Section */}
      <div className="flex flex-col md:flex-row justify-between gap-10 md:pt-4 pt-2">
        {/* Left */}
        <div className="w-full md:w-1/2 flex flex-col gap-3">
          <div className="flex flex-col lg:gap-2 gap-1">
            <Link
              to="/"
              className="flex items-center gap-2 text-xl font-bold lg:text-2xl"
            >
              <img src="/whitebag.png" alt="logo" className="w-5 h-5" />
              <h1> Unideals</h1>
            </Link>

            <h1 className="flex items-center gap-2 md:text-xl text-sm lg:text-lg font-poppins">
              <span className="font-extralight">~ platform build by</span>{" "}
              <a
                href="https://imaginumorg.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white font-poppins font-extrabold hover:text-black duration-300 ease-in-out"
              >
                Imaginum
              </a>
            </h1>
          </div>

          <p className="text-[4vw] md:text-[2vw] lg:text-[1.5vw] leading-snug">
            The Ultimate Marketplace for <br />
            Students to Buy, Sell, and Trade with Ease!
          </p>
        </div>

        {/* Right */}
        <div className="hidden md:flex flex-col items-end gap-4 w-full md:w-1/2 md:mt-8 lg:mt-6">
          <h2 className="text-[1.2vw] flex items-center gap-2 font-medium md:text-[2.3vw] lg:text-[1.5vw] font-poppins">
            Feedback? We're Listening!
            <FaHeart className="text-white" />
          </h2>

          <div className="relative md:w-2/3 lg:w-1/2">
            <Link
              to={"/contact"}
              className="z-10 absolute inset-x-0 top-0 py-3 px-10 text-black bg-white rounded-3xl text-lg font-semibold text-center"
            >
              Send Us
            </Link>
            <div className="border border-slate-200 bg-transparent rounded-3xl py-6 px-20 md:mt-3 md:ml-[-0.5vw] md:mr-2"></div>
          </div>
        </div>
      </div>

      {/* Middle Section */}
      <div className="flex justify-between items-center my-10 relative">
        <button className="z-10 py-2 px-7 lg:py-3 lg:px-10 text-black bg-white rounded-3xl font-semibold hover:scale-105 transition-transform duration-200 md:text-base text-sm">
          Share with friends
        </button>

        <img
          src="/assets/Line_11.png"
          alt="decorative line"
          className="absolute right-0 w-[60%] lg:w-auto"
        />
      </div>

      {/* Mobile Feedback */}
      <div className="md:hidden flex flex-col gap-2 mb-10">
        <h2 className="text-[4.3vw] mb-1">Feedback? We're Listening!</h2>

        <div className="relative w-2/3">
          <a
            href="mailto:sarthakkrishak1234@gmail.com"
            className="z-10 absolute inset-x-0 top-0 py-3 px-10 text-black bg-white rounded-3xl text-sm font-semibold text-center"
          >
            Send Us
          </a>

          <div className="border border-slate-200 bg-transparent rounded-3xl py-6 px-20 ml-[-0.8vw] mr-2"></div>
        </div>
      </div>

      {/* Bottom Links */}
      <div className="flex flex-col-reverse md:flex-row justify-between gap-10 mt-8">
        {/* Social Icons */}
        <div className="flex gap-4 items-end">
          {[
            { Icon: FaInstagram, link: "#" },
            { Icon: FaLinkedin, link: "#" },
            { Icon: FaXTwitter, link: "#" },
          ].map(({ Icon, link }, idx) => (
            <a
              key={idx}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 text-2xl bg-blue-700 shadow-[2px_4px_18px_0px_rgba(0,0,0,0.20)] border border-white/50 rounded-full hover:shadow-lg transition-shadow duration-300"
            >
              <Icon />
            </a>
          ))}
        </div>

        {/* Navigation Links */}
        <div className="flex gap-16 pl-2">
          <ul className="space-y-3 text-sm md:text-lg">
            {["Orders", "Chats", "Dev team"].map((text, i) => (
              <li
                key={i}
                className="hover:text-black transition-colors duration-300"
              >
                <Link to="/">{text}</Link>
              </li>
            ))}
          </ul>

          <ul className="space-y-3 text-sm md:text-lg">
            {["Sell a product", "Notification", "Contact us"].map((text, i) => (
              <li
                key={i}
                className="hover:text-black transition-colors duration-300"
              >
                <Link to="/">{text}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="border-t border-white/30 mt-10 pt-4 md:text-sm text-sm pb-4 text-white flex flex-col md:flex-row md:items-center justify-between">
        <p className="hover:underline cursor-default">
          © 2026 All rights reserved
        </p>

        <p className="text-[3.5vw] hidden md:block sm:text-base mt-1">
          Designed and developed by{" "}
          <a
            href="https://www.linkedin.com/in/sarthakkrishak/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:text-black transition"
          >
            Sarthak
          </a>
          ,{" "}
          <a href="#" className="font-semibold hover:text-black transition">
            Kamal
          </a>
          , and{" "}
          <a href="#" className="font-semibold hover:text-black transition">
            Anurag
          </a>
          .
        </p>

        {/* Mobile */}
        <p className="text-xs md:hidden sm:text-base mt-1">
          Developed by{" "}
          <a
            href="https://www.linkedin.com/in/sarthakkrishak/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:text-black transition"
          >
            Sarthak
          </a>
          ,{" "}
          <a href="#" className="font-semibold hover:text-black transition">
            Kamal
          </a>
          , and{" "}
          <a href="#" className="font-semibold hover:text-black transition">
            Anurag
          </a>
          .
        </p>
      </div>
    </footer>
  );
};

export default Footer;
