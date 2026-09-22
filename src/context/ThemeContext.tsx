import React, { createContext, useContext } from "react";

const ThemeContext = createContext<any>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const useTheme = () => {
  return {
    theme: "system",
    setTheme: () => {}
  };
};
