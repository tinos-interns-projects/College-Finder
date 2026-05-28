import { useEffect, useMemo, useState, useRef } from "react";
import { FaRobot, FaTimes } from "react-icons/fa";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://college-finder-9nuh.onrender.com";

function App() {
  const [data, setData] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hi! Ask me about colleges, fees, programs, or locations.",
    },
  ]);

  const [filters, setFilters] = useState({
    state: "",
    location: "",
    program: "",
    course: "",
    sortOrder: "",
  });

  const [states, setStates] = useState([]);
  const [locations, setLocations] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);

  const chatBottomRef = useRef(null);

  const hasAnyFilter = useMemo(() => {
    return (
      appliedQuery.trim() !== "" ||
      filters.state !== "" ||
      filters.location !== "" ||
      filters.program !== "" ||
      filters.course !== ""
    );
  }, [appliedQuery, filters]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, chatOpen]);

  const loadDropdownOptions = async (nextState = filters.state, nextProgram = filters.program) => {
    try {
      const params = new URLSearchParams();
      if (nextState) params.set("state", nextState);
      if (nextProgram) params.set("program_level", nextProgram);

      const response = await fetch(`${BASE_URL}/api/dropdowns/?${params.toString()}`);
      const meta = await response.json();

      setStates(meta.states || []);
      setLocations(meta.locations || []);
      setPrograms(meta.programs || []);
      setCourses(meta.courses || []);
    } catch (error) {
      console.error("Error loading dropdown options:", error);
    }
  };

  const runSearch = async (override = {}) => {
    const finalFilters = { ...filters, ...override };
    const currentQuery = appliedQuery.trim();

    setLoadingResults(true);
    try {
      const params = new URLSearchParams();

      if (currentQuery) params.set("search", currentQuery);
      if (finalFilters.state) params.set("state", finalFilters.state);
      if (finalFilters.location) params.set("location", finalFilters.location);
      if (finalFilters.program) params.set("program_level", finalFilters.program);
      if (finalFilters.course) params.set("course_name", finalFilters.course);

      const response = await fetch(`${BASE_URL}/api/search/?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Search failed");
      }

      let rows = Array.isArray(result) ? [...result] : [];

      if (finalFilters.sortOrder === "lowToHigh") {
        rows.sort((a, b) => (a.total_fee || 0) - (b.total_fee || 0));
      } else if (finalFilters.sortOrder === "highToLow") {
        rows.sort((a, b) => (b.total_fee || 0) - (a.total_fee || 0));
      }

      setData(rows);
      setHasSearched(true);
    } catch (error) {
      console.error("Search error:", error);
      setData([]);
      setHasSearched(true);
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    loadDropdownOptions(filters.state, filters.program);
  }, [filters.state, filters.program]);

  useEffect(() => {
    if (!hasAnyFilter && filters.sortOrder === "") {
      setHasSearched(false);
      setData([]);
      return;
    }
    runSearch();
  }, [appliedQuery, filters.state, filters.location, filters.program, filters.course, filters.sortOrder]);

  const handleSearch = () => {
    setAppliedQuery(query.trim());
  };

  const sendMessage = async () => {
    if (!question.trim()) return;

    const userText = question.trim();
    const updatedMessages = [...messages, { sender: "user", text: userText }];

    setMessages(updatedMessages);
    setQuestion("");
    setIsTyping(true);

    try {
      const response = await fetch(`${BASE_URL}/api/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      const result = await response.json();

      setMessages([
        ...updatedMessages,
        {
          sender: "bot",
          text: result.reply || result.message || "Empty response format detected.",
        },
      ]);
    } catch (error) {
      setMessages([
        ...updatedMessages,
        {
          sender: "bot",
          text: "Sorry, I am having trouble reaching the server right now.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleOuterClick = () => {
    if (chatOpen) setChatOpen(false);
  };

  return (
    <div onClick={handleOuterClick} className="min-h-screen bg-[#f8f6f1] flex flex-col items-center px-6 py-10">
      <h1 className="text-5xl font-bold text-[#556b2f] mb-10 text-center select-none">
        Course Fee Searcher
      </h1>

      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl mb-10 flex gap-4">
        <div className="relative flex-1">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Search for a course to view fee..."
            className="w-full pl-14 pr-5 py-5 rounded-3xl border border-gray-200 shadow-lg text-lg bg-white outline-none focus:border-[#556b2f] transition"
          />
        </div>
        <button
          onClick={handleSearch}
          className="bg-[#556b2f] text-white px-8 py-4 rounded-3xl shadow-lg hover:opacity-90 transition font-semibold"
        >
          Search
        </button>
      </div>

      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-7xl bg-white/90 backdrop-blur-sm border border-gray-200 rounded-3xl shadow-xl p-7 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
          <select
            value={filters.state}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                state: e.target.value,
                location: "",
              }))
            }
            className="p-4 rounded-2xl border border-gray-200 bg-[#fafaf7] shadow-sm outline-none focus:border-[#556b2f] transition text-gray-700 font-medium cursor-pointer"
          >
            <option value="">State</option>
            {states.map((st, idx) => (
              <option key={idx} value={st}>
                {st}
              </option>
            ))}
          </select>

          <select
            value={filters.location}
            onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}
            className="p-4 rounded-2xl border border-gray-200 bg-[#fafaf7] shadow-sm outline-none focus:border-[#556b2f] transition text-gray-700 font-medium cursor-pointer"
          >
            <option value="">Location</option>
            {locations.map((loc, idx) => (
              <option key={idx} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <select
            value={filters.program}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                program: e.target.value,
                course: "",
              }))
            }
            className="p-4 rounded-2xl border border-gray-200 bg-[#fafaf7] shadow-sm outline-none focus:border-[#556b2f] transition text-gray-700 font-medium cursor-pointer"
          >
            <option value="">Program</option>
            {programs.map((prog, idx) => (
              <option key={idx} value={prog}>
                {prog}
              </option>
            ))}
          </select>

          <select
            value={filters.course}
            onChange={(e) => setFilters((prev) => ({ ...prev, course: e.target.value }))}
            className="p-4 rounded-2xl border border-gray-200 bg-[#fafaf7] shadow-sm outline-none focus:border-[#556b2f] transition text-gray-700 font-medium cursor-pointer"
          >
            <option value="">Course / Specialization</option>
            {courses.map((crs, idx) => (
              <option key={idx} value={crs}>
                {crs}
              </option>
            ))}
          </select>

          <select
            value={filters.sortOrder}
            onChange={(e) => setFilters((prev) => ({ ...prev, sortOrder: e.target.value }))}
            className="p-4 rounded-2xl border border-gray-200 bg-[#fafaf7] shadow-sm outline-none focus:border-[#556b2f] transition text-gray-700 font-medium cursor-pointer"
          >
            <option value="">Sort By Fee</option>
            <option value="highToLow">Highest to Lowest</option>
            <option value="lowToHigh">Lowest to Highest</option>
          </select>
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {!hasSearched ? (
          <div className="col-span-1 md:col-span-2 text-center py-16 bg-white/60 border border-dashed border-gray-300 rounded-3xl p-10 select-none">
            <h2 className="text-2xl font-semibold text-[#556b2f] mb-2">Welcome to College Finder</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Select filters above or type a search query to begin pulling fee records.
            </p>
          </div>
        ) : loadingResults ? (
          <p className="text-gray-500 col-span-1 md:col-span-2 text-center py-16 font-medium bg-white rounded-3xl border shadow-sm">
            Loading results...
          </p>
        ) : data.length > 0 ? (
          data.map((course) => (
            <div
              key={course.id}
              className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition duration-200"
            >
              <h3 className="text-xl font-bold text-[#556b2f]">{course.college}</h3>
              <p className="text-sm text-gray-500 mb-2">
                📍 {course.location}, {course.state}
              </p>
              <div className="border-t pt-3 mt-2">
                <p className="text-md font-medium text-gray-800">
                  📖 {course.course_name} ({course.program_level})
                </p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  Fee: {course.total_fee ? `INR ${Number(course.total_fee).toLocaleString()}` : "Contact College"}
                </p>
                {course.notes && (
                  <p className="text-xs text-gray-400 italic mt-1">📝 {course.notes}</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 col-span-1 md:col-span-2 text-center py-16 font-medium bg-white rounded-3xl border shadow-sm">
            No active course profiles found matching your active filter choices.
          </p>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setChatOpen(!chatOpen);
        }}
        className="fixed bottom-6 right-6 bg-[#556b2f] text-white p-5 rounded-full shadow-xl hover:scale-105 transition z-50 outline-none"
      >
        {chatOpen ? <FaTimes size={22} /> : <FaRobot size={22} />}
      </button>

      {chatOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-24 right-6 w-[360px] h-[520px] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-50"
        >
          <div className="bg-[#556b2f] text-white px-5 py-4 text-lg font-semibold select-none">
            AI College Assistant
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fafafa]">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-line shadow-sm leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-[#556b2f] text-white ml-auto"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                {msg.text}
              </div>
            ))}

            {isTyping && (
              <div className="bg-gray-200 text-gray-500 max-w-[60px] px-4 py-3 rounded-2xl text-sm shadow-sm flex items-center justify-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          <div className="border-t bg-white p-3 flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about colleges..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 outline-none focus:border-[#556b2f] text-sm"
            />
            <button
              onClick={sendMessage}
              className="bg-[#556b2f] text-white px-4 rounded-xl hover:opacity-90 transition font-medium text-sm"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
