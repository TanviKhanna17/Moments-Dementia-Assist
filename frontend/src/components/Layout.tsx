import { motion } from "framer-motion";
import { ReactNode } from "react";
import { AnimatedBackground } from "./AnimatedBackground";
import { Navbar } from "./Navbar";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-[#101010] text-white relative">
      <AnimatedBackground />
      <Navbar />
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="relative z-10"
      >
        {children}
      </motion.main>
    </div>
  );
};
