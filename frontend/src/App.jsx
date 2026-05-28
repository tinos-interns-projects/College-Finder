import { useEffect, useState, useRef } from "react";
import { FaRobot, FaTimes } from "react-icons/fa";

function App() {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://college-finder-9nuh.onrender.com";
  
  const [data, setData] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  // UNFILTERED MASTER DATA BACKUP (Fixes the dropdown vanishing bug)
  const [masterData, setMasterData] = useState([]);

  // SEARCH INPUT TRACKING TERMINAL
  const [searchTerm, setSearchTerm] = useState("");

  // TRACK WHETHER THE USER HAS INITIATED A SEARCH YET
  const [hasSearched, setHasSearched] = useState(false);

  // CHATBOT INTERFACE STATES
  const [chatOpen, setChatOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hi! Ask me about colleges, fees, programs, or locations.",
    },
  ]);

  // UNIFIED DROPDOWN MATRIX FILTER LABELS
  const [filters, setFilters] = useState({
    state: "State",
    location: "Location",
    program: "Program",
    course: "Course / Specialization",
  });

  // SORT CRITERIA STATE
  const [sortOrder, setSortOrder] = useState("");

  // DYNAMIC MASTER ARRAY STORAGE FROM DATASET
  const [states, setStates] = useState([]);
  const [locations, setLocations] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);

  // REFERENCE ANCHOR FOR CHAT STREAM BOTTOM
  const chatBottomRef = useRef(null);

  // AUTOMATIC CHAT CONTAINER SCROLLER LOGIC
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, chatOpen]);

  // EFFECT 1: SYSTEM BOOT INTERCEPTOR (Saves master dataset copy)
  useEffect(() => {
    const loadDropdownOptions = async () => {
      try {
        // Fetch the raw, unfiltered backend dataset just to generate dropdown labels
        const response = await fetch(`${BASE_URL}/api/search/?search=`);
        const allData = await response.json();

        // 🚀 Store full array here to preserve options independently of active grid searches
        setMasterData(allData);

        setStates([...new Set(allData.map(item => item.state).filter(Boolean))].sort());
        setLocations([...new Set(allData.map(item => item.location).filter(Boolean))].sort());
        setPrograms([...new Set(allData.map(item => item.program_level).filter(Boolean))].sort());
        setCourses([...new Set(allData.map(item => item.course_name).filter(Boolean))].sort());
      } catch (error) {
        console.error("Error pulling database metadata collections from backend:", error);
      }
    };

    loadDropdownOptions();
  }, []);

  // API SYSTEM CALL FOR PARSING SEARCH VIEWS (Combined text bar + dropdown filters)
  const fetchFilteredData = async () => {
    try {
      const queryState = filters.state !== "State" ? filters.state : "";
      const queryProg = filters.program !== "Program" ? filters.program : "";
      const queryCourse = filters.course !== "Course / Specialization" ? filters.course : "";

      // SMART FALLBACK: If search bar is empty, use the Course Dropdown selection!
      const activeSearchValue = searchTerm.trim() !== "" ? searchTerm : queryCourse;

      let url = `${BASE_URL}/api/search/?search=${encodeURIComponent(activeSearchValue)}&state=${queryState}&program_level=${queryProg}`;

      const response = await fetch(url);
      const jsonResult = await response.json();

      let processedData = [...jsonResult];

      // Local matching parameters
      if (filters.location && filters.location !== "Location") {
        processedData = processedData.filter(
          (item) => item.location?.toLowerCase() === filters.location.toLowerCase()
        );
      }

      // Re-sort current data structures based on selection criteria
      if (sortOrder === "lowToHigh") {
        processedData.sort((a, b) => (a.total_fee || 0) - (b.total_fee || 0));
      } else if (sortOrder === "highToLow") {
        processedData.sort((a, b) => (b.total_fee || 0) - (a.total_fee || 0));
      }

      setData(processedData);
    } catch (error) {
      console.error("Communication loss on Django endpoint channel:", error);
    }
  };

  // EFFECT 2: RE-FETCH DATA ROWS DYNAMICALLY WHENEVER ANY STATE CONTEXT ALTERS
  useEffect(() => {
    const isUserInteracting =
      searchTerm.trim() !== "" ||
      filters.state !== "State" ||
      filters.location !== "Location" ||
      filters.program !== "Program" ||
      filters.course !== "Course / Specialization" ||
      sortOrder !== "";

    if (isUserInteracting) {
      setHasSearched(true);
      fetchFilteredData();
    } else {
      // If the user clears out all searches/filters entirely, revert to placeholder page state
      setHasSearched(false);
      setData([]);
    }
  }, [searchTerm, filters, sortOrder]);

  // BUTTON CLICK TRIGGER BACKUP
  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    setHasSearched(true);
    fetchFilteredData();
  };

  // SEND MESSAGE CONTEXT TO CHATBOT VIEW
  const sendMessage = async () => {
    if (!question.trim()) return;

    const userMsg = { sender: "user", text: question };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setQuestion("");
    setIsTyping(true); // Turn loading animation ON
    
    try {
      const response = await fetch('${BASE_URL}/api/chat/', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text }),
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
      setIsTyping(false); // Turn loading animation OFF when done
    }
  };

  const handleOuterClick = () => {
    if (chatOpen) setChatOpen(false);
  };

  return (
    <div onClick={handleOuterClick} className="min-h-screen bg-[#f8f6f1] flex flex-col items-center px-6 py-10">

      {/* TITLE */}
      <h1 className="text-5xl font-bold text-[#556b2f] mb-10 text-center select-none">
        Course Fee Searcher
      </h1>

      {/* SEARCH CONTAINER BAR */}
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl mb-10 flex gap-4">
        <div className="relative flex-1">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder="Search for a course to view fee..."
            className="w-full pl-14 pr-5 py-5 rounded-3xl border border-gray-200 shadow-lg text-lg bg-white outline-none focus:border-[#556b2f] transition"
          />
        </div>
        <button onClick={handleSearch} className="bg-[#556b2f] text-white px-8 py-4 rounded-3xl shadow-lg hover:opacity-90 transition font-semibold">
          Search
        </button>
      </div>

      {/* 5-COLUMN MATRIX DROPDOWN BLOCK */}
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-7xl bg-white/90 backdrop-blur-sm border border-gray-200 rounded-3xl shadow-xl p-7 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
          {/* 1. STATE SELECT */}
          <select value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value, location: "Location" })} className="p-4 rounded-2xl border border-gray-200 bg-[#fafaf7] shadow-sm outline-none focus:border-[#556b2f] transition text-gray-700 font-medium cursor-pointer">
            <option value="State">State</option>
            {states.map((st, idx) => <option key={idx} value={st}>{st}</option>)}
          </select>

          {/* 2. SMART LOCATION SELECT (Chained to State via masterData) */}
          <select value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} className="p-4 rounded-2xl border border-gray-200 bg-[#fafaf7] shadow-sm outline-none focus:border-[#556b2f] transition text-gray-700 font-medium cursor-pointer">
            <option value="Location">Location</option>
            {locations
              .filter(loc => {
                if (filters.state === "State") return true;
                return masterData.some(item => item.state === filters.state && item.location === loc);
              })
              .map((loc, idx) => <option key={idx} value={loc}>{loc}</option>)
            }
          </select>

          {/* 3. PROGRAM SELECT */}
          <select value={filters.program} onChange={(e) => setFilters({ ...filters, program: e.target.value, course: "Course / Specialization" })} className="p-4 rounded-2xl border border-gray-200 bg-[#fafaf7] shadow-sm outline-none focus:border-[#556b2f] transition text-gray-700 font-medium cursor-pointer">
            <option value="Program">Program</option>
            {programs.map((prog, idx) => <option key={idx} value={prog}>{prog}</option>)}
          </select>

          {/* 4. SMART COURSE SELECT (🚀 Chained STRICTLY to Program Level using masterData) */}
          <select value={filters.course} onChange={(e) => setFilters({ ...filters, course: e.target.value })} className="p-4 rounded-2xl border border-gray-200 bg-[#fafaf7] shadow-sm outline-none focus:border-[#556b2f] transition text-gray-700 font-medium cursor-pointer">
            <option value="Course / Specialization">Course / Specialization</option>
            {courses
              .filter(crs => {
                if (filters.program === "Program") return true;
                return masterData.some(item => item.program_level === filters.program && item.course_name === crs);
              })
              .map((crs, idx) => <option key={idx} value={crs}>{crs}</option>)
            }
          </select>

          {/* 5. SORT ORDER SELECT */}
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="p-4 rounded-2xl border border-gray-200 bg-[#fafaf7] shadow-sm outline-none focus:border-[#556b2f] transition text-gray-700 font-medium cursor-pointer">
            <option value="">Sort By Fee</option>
            <option value="highToLow">Highest to Lowest</option>
            <option value="lowToHigh">Lowest to Highest</option>
          </select>
        </div>
      </div>

      {/* CONDITIONAL RENDERING GRID */}
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {!hasSearched ? (
          /* INITIAL STATE WELCOME SCREEN CARD PLACEHOLDER */
          <div className="col-span-1 md:col-span-2 text-center py-16 bg-white/60 border border-dashed border-gray-300 rounded-3xl p-10 select-none">
            <h2 className="text-2xl font-semibold text-[#556b2f] mb-2">Welcome to College Finder</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Select a filter criteria dropdown above or type a search query keyword to begin pulling fee records instantly.
            </p>
          </div>
        ) : data.length > 0 ? (
          /* ACTIVE FILTER RESULTS GRID */
          data.map((course) => (
            <div key={course.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition duration-200">
              <h3 className="text-xl font-bold text-[#556b2f]">{course.college}</h3>
              <p className="text-sm text-gray-500 mb-2">📍 {course.location}, {course.state}</p>
              <div className="border-t pt-3 mt-2">
                <p className="text-md font-medium text-gray-800">📖 {course.course_name} ({course.program_level})</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  Fee: {course.total_fee ? `INR ${course.total_fee.toLocaleString()}` : "Contact College"}
                </p>
                {course.notes && <p className="text-xs text-gray-400 italic mt-1">📝 {course.notes}</p>}
              </div>
            </div>
          ))
        ) : (
          /* SEARCH EXECUTED BUT ABSOLUTELY ZERO RESULTS FETCHED FROM SQL */
          <p className="text-gray-500 col-span-1 md:col-span-2 text-center py-16 font-medium bg-white rounded-3xl border shadow-sm">
            No active course profiles found matching your active filter choices.
          </p>
        )}
      </div>

      {/* FLOAT INTERACTION ICON CONTROL */}
      <button onClick={(e) => { e.stopPropagation(); setChatOpen(!chatOpen); }} className="fixed bottom-6 right-6 bg-[#556b2f] text-white p-5 rounded-full shadow-xl hover:scale-105 transition z-50 outline-none">
        {chatOpen ? <FaTimes size={22} /> : <FaRobot size={22} />}
      </button>

      {/* CHAT DISPLAY LAYOUT INTERFACE */}
      {chatOpen && (
        <div onClick={(e) => e.stopPropagation()} className="fixed bottom-24 right-6 w-[360px] h-[520px] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-50">
          <div className="bg-[#556b2f] text-white px-5 py-4 text-lg font-semibold select-none">
            AI College Assistant
          </div>

          {/* MESSAGE BOX AREA WITH SMOOTH SCROLL ANCHOR */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fafafa]">
            {messages.map((msg, index) => (
              <div key={index} className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-line shadow-sm leading-relaxed ${msg.sender === "user" ? "bg-[#556b2f] text-white ml-auto" : "bg-gray-200 text-gray-800"}`}>
                {msg.text}
              </div>
            ))}

            {/* PULSING LOADING INDICATOR */}
            {isTyping && (
              <div className="bg-gray-200 text-gray-500 max-w-[60px] px-4 py-3 rounded-2xl text-sm shadow-sm flex items-center justify-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            )}

            {/* INVISIBLE SCROLL TARGET ANCHOR */}
            <div ref={chatBottomRef} />
          </div>

          <div className="border-t bg-white p-3 flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask about colleges..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 outline-none focus:border-[#556b2f] text-sm"
            />
            <button onClick={sendMessage} className="bg-[#556b2f] text-white px-4 rounded-xl hover:opacity-90 transition font-medium text-sm">
              Send
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
