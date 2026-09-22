import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import api, { setAuthToken } from "../api/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import debounce from "lodash.debounce";
import moment from "moment";
import { AppContextType, AppContextProviderProps, User, Project, ProjectSummary, DeviceViewport, SettingsTab } from "../types";

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: AppContextProviderProps) {
  const navigate = useNavigate();

  // Auth States
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);

  // States
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loadingActiveProject, setLoadingActiveProject] = useState<boolean>(true);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [generatingProject, setGeneratingProject] = useState<boolean>(false);
  const [activeFile, setActiveFile] = useState<string>("/App.js");
  const [showCode, setShowCode] = useState<boolean>(false);
  const [deviceViewport, setDeviceViewport] = useState<DeviceViewport>('desktop');
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Auth Actions
  const checkSession = async () => {
    try {
      const { data } = await api.get("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
      setAuthToken(null);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      if (data.token) {
        setAuthToken(data.token);
      }
      setUser(data.user);
      toast.success("Welcome back!");
      navigate("/");
    } catch (err: any) {
      console.error("Login failed:", err);
      const errMsg = err?.response?.data?.error || "Invalid email or password";
      toast.error(errMsg);
      throw new Error(errMsg);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<void> => {
    try {
      const { data } = await api.post("/api/auth/register", { name, email, password });
      if (data.token) {
        setAuthToken(data.token);
      }
      setUser(data.user);
      toast.success("Account created successfully!");
      navigate("/");
    } catch (err: any) {
      console.error("Registration failed:", err);
      const errMsg = err?.response?.data?.error || "Registration failed";
      toast.error(errMsg);
      throw new Error(errMsg);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post("/api/auth/logout");
      setAuthToken(null);
      setUser(null);
      setProjects([]);
      setActiveProject(null);
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (err: any) {
      console.error("Logout failed:", err);
      setAuthToken(null);
      setUser(null);
      toast.error("Logout failed");
    }
  };

  const updateProfile = async (profileData: string | Partial<User>): Promise<any> => {
    try {
      const payload = typeof profileData === 'string' ? { name: profileData } : profileData;
      const { data } = await api.put("/api/auth/profile", payload);
      if (data.user) {
        setUser((prev) => (prev ? { ...prev, ...data.user } : data.user));
      }
      return data;
    } catch (err: any) {
      console.error("Update profile failed:", err);
      const errMsg = err?.response?.data?.error || "Failed to update profile";
      throw new Error(errMsg);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<any> => {
    try {
      const { data } = await api.put("/api/auth/password", { currentPassword, newPassword });
      return data;
    } catch (err: any) {
      console.error("Change password failed:", err);
      const errMsg = err?.response?.data?.error || "Failed to change password";
      throw new Error(errMsg);
    }
  };

  const deleteAccount = async (): Promise<any> => {
    try {
      const { data } = await api.delete("/api/auth/account");
      setUser(null);
      setProjects([]);
      setActiveProject(null);
      toast.success("Account and data deleted permanently");
      navigate("/login");
      return data;
    } catch (err: any) {
      console.error("Delete account failed:", err);
      const errMsg = err?.response?.data?.error || "Failed to delete account";
      toast.error(errMsg);
      throw new Error(errMsg);
    }
  };

  const exportAccountData = async (): Promise<any> => {
    try {
      const toastId = toast.loading("Generating your account data package...");
      const { data } = await api.get("/api/auth/export-data");
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `builder_ai_userdata_${moment().format("YYYY-MM-DD")}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Account data exported successfully!", { id: toastId });
      return data;
    } catch (err: any) {
      console.error("Export data failed:", err);
      const errMsg = err?.response?.data?.error || "Failed to export account data";
      toast.error(errMsg);
      throw new Error(errMsg);
    }
  };

  // Settings Modal State
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profile');
  const openSettings = (tab: SettingsTab = 'profile') => {
    setSettingsTab(tab);
    setSettingsModalOpen(true);
  };
  const closeSettings = () => setSettingsModalOpen(false);

  // Projects Actions
  const loadProjects = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get("/api/projects");
      setProjects(data);
    } catch (err: any) {
      console.error("Failed to list projects:", err);
      if (err?.response?.status !== 401) {
        toast.error(err?.response?.data?.error || "Failed to load projects list");
      }
    } finally {
      setLoadingProjects(false);
    }
  }, [user]);

  const loadProject = useCallback(
    async (id: string, silent: boolean = false) => {
      if (!user) return;
      if (!silent) setLoadingActiveProject(true);
      try {
        const { data } = await api.get(`/api/projects/${id}`);
        setActiveProject(data);

        // Default file selection
        const files = Object.keys(data.files || {});
        if (files.length > 0) {
          setActiveFile((prev) => {
            if (files.includes(prev)) return prev;
            if (files.includes("/App.js")) return "/App.js";
            return files[0];
          });
        }
      } catch (err: any) {
        console.error("Failed to load project:", err);
        if (!silent) {
          toast.error("Failed to load project details");
          navigate("/");
        }
      } finally {
        if (!silent) setLoadingActiveProject(false);
      }
    },
    [user, navigate]
  );

  // Automatically poll active project status if generating or pending
  useEffect(() => {
    if (!activeProject?._id || !user) return;

    const isOngoing =
      activeProject.status === "generating" ||
      activeProject.status === "pending" ||
      activeProject.status === "revising";

    if (isOngoing) {
      setChatLoading(true);
      const interval = setInterval(() => {
        loadProject(activeProject._id, true);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setChatLoading(false);
    }
  }, [activeProject?._id, activeProject?.status, loadProject, user]);

  const handleGenerate = useCallback(
    async (prompt: string, images: string[] = []) => {
      if (!user) return;

      setGeneratingProject(true);
      try {
        const { data } = await api.post("/api/projects", { prompt, images });
        if (images && images.length > 0) {
          toast.success(`AI Agent is analyzing ${images.length} reference screenshot(s)...`);
        } else {
          toast.success("AI Agent is planning structure...");
        }
        navigate(`/builder/${data._id}`);
      } catch (err: any) {
        console.error("Failed to generate project:", err);
        toast.error(err?.response?.data?.error || "Failed to generate project");
      } finally {
        setGeneratingProject(false);
      }
    },
    [navigate, user]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!user) return;

      try {
        await api.delete(`/api/projects/${id}`);
        setProjects((prev) => prev.filter((p) => p._id !== id));
        toast.success("Project deleted successfully");
      } catch (err: any) {
        console.error("Failed to delete project:", err);
        toast.error("Failed to delete project");
      }
    },
    [user]
  );

  const handleChat = useCallback(
    async (prompt: string, images: string[] = []) => {
      if (!activeProject || !user) return;
      setChatLoading(true);
      try {
        const { data } = await api.post(`/api/projects/${activeProject._id}/chat`, { prompt, images });
        setActiveProject(data);
        if (data.errors && data.errors.length > 0) {
          toast.error(`${data.errors.length} revision patch(es) failed`);
        } else {
          toast.success(`Updated to version ${data.version}`);
        }
      } catch (err: any) {
        console.error("Revision request failed:", err);
        toast.error(err?.response?.data?.error || "Revision request failed");
      } finally {
        setChatLoading(false);
      }
    },
    [activeProject, user]
  );

  const handleStopGeneration = useCallback(
    async (projectId?: string) => {
      const targetId = projectId || activeProject?._id;
      if (!targetId || !user) return;
      try {
        const { data } = await api.post(`/api/projects/${targetId}/stop`);
        if (data) {
          setActiveProject(data);
        }
        setChatLoading(false);
        setGeneratingProject(false);
        toast.success("Generation stopped");
      } catch (err: any) {
        console.error("Failed to stop generation:", err);
        toast.error(err?.response?.data?.error || "Failed to stop generation");
      }
    },
    [activeProject?._id, user]
  );

  const debouncedSave = React.useMemo(
    () =>
      debounce(async (files: Record<string, string>, id: string) => {
        try {
          await api.put(`/api/projects/${id}/files`, { files });
        } catch (err: any) {
          console.error("Failed to auto-save files:", err);
          toast.error("Failed to save code modifications");
        }
      }, 1000),
    []
  );

  useEffect(() => {
    return () => {
      debouncedSave.flush();
    };
  }, [debouncedSave]);

  const updateProjectFiles = useCallback(
    async (files: Record<string, string>) => {
      if (!activeProject || !user) return;
      debouncedSave(files, activeProject._id);
    },
    [activeProject, user, debouncedSave]
  );

  const handleRollbackProject = useCallback(
    async (targetVersion: number) => {
      if (!activeProject?._id || !user) return;
      try {
        const { data } = await api.post(`/api/projects/${activeProject._id}/rollback`, { targetVersion });
        if (data.project) {
          setActiveProject(data.project);
          toast.success(`Restored Version v${targetVersion}!`);
        }
      } catch (err: any) {
        console.error("Rollback failed:", err);
        const errMsg = err?.response?.data?.error || "Failed to rollback project";
        toast.error(errMsg);
        throw new Error(errMsg);
      }
    },
    [activeProject?._id, user]
  );

  return (
    <AppContext.Provider
      value={{
        user,
        loadingUser,
        login,
        register,
        projects,
        loadingProjects,
        activeProject,
        loadingActiveProject,
        chatLoading,
        generatingProject,
        activeFile,
        showCode,
        deviceViewport,
        isHistoryOpen,
        isCommandPaletteOpen,
        setActiveFile,
        setShowCode,
        setDeviceViewport,
        setIsHistoryOpen,
        setIsCommandPaletteOpen,
        loadProjects,
        loadProject,
        handleGenerate,
        handleDelete,
        logout,
        updateProfile,
        changePassword,
        deleteAccount,
        exportAccountData,
        settingsModalOpen,
        settingsTab,
        openSettings,
        closeSettings,
        updateProjectFiles,
        handleChat,
        handleStopGeneration,
        handleRollbackProject,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppContextProvider");
  }
  return context;
}
