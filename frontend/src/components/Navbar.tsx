import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const backgroundOpacity = useTransform(scrollY, [0, 100], [0, 0.8]);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
      style={{
        backgroundColor: useTransform(
          scrollY,
          [0, 100],
          ["rgba(0,0,0,0)", "rgba(0,0,0,0.8)"]
        ),
        backdropFilter: useTransform(
          scrollY,
          [0, 100],
          ["blur(0px)", "blur(20px)"]
        ),
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/">
          <motion.div
            className="flex items-center space-x-2 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Heart className="h-8 w-8 text-[#E02478]" />
            <span className="text-2xl font-bold text-white">Moments</span>
          </motion.div>
        </Link>

        <div className="flex items-center space-x-6">
          {!isAuthenticated ? (
            <>
              <Button
                variant="ghost"
                className="hover:text-[#E02478] transition-colors"
              >
                Features
              </Button>
              <Button
                variant="ghost"
                className="hover:text-[#E02478] transition-colors"
              >
                About
              </Button>
              <Link to="/auth">
                <Button variant="outline">Log In</Button>
              </Link>
              <Link to="/register">
                <Button>Sign Up</Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/dashboard">
                <Button
                  variant="ghost"
                  className="hover:text-[#E02478] transition-colors"
                >
                  Dashboard
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                Log Out
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
};
