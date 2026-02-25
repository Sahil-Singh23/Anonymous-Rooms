import ChatIcon from "../icons/ChatIcon"
import Alert from "../components/Alert"
import Glow from "../components/Glow"
import Input from "../components/Input"
import Button from "../components/Button"
import { useEffect, useRef, useState } from "react"
import SendIcon from "../icons/SendIcon"
import Message from "../components/Message"
import TypingBubble from "../components/TypingBubble"
import { v4 as uuidv4 } from 'uuid'
import { useParams, useNavigate } from 'react-router-dom'
import LoadingOverlay from "../components/LoadingOverlay"
import ShareLinkModal from "../components/ShareLinkModal"

interface StoredSession{
  roomCode: string ,
  sessionId: string,
  nickname: string,
  timestamp : number
}

const Room = () => {
  const { roomCode: paramRoomCode } = useParams<{ roomCode?: string }>();
  const [msgs,setMsgs] = useState<{user:string,msg:string,hours:number,minutes:number,isSelf:boolean,status?:'sending'|'sent',timestamp:number}[]>([])
  const msgRef = useRef<HTMLInputElement | null>(null);
  const ws = useRef<WebSocket|null>(null);
  const msgsEndRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const nicknameRef = useRef('');
  const roomCodeRef = useRef('');
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('chatSession');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.sessionId;
      }
      return uuidv4();
  });
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('success');
  const hasAutoShownRef = useRef(false);
  const [userCount,setUserCount] = useState<number>(0);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const lastTypingSent = useRef(0);
  const [typingUsers,setTypingUsers] = useState<Map<string,{user:string,timestamp: number}>>(new Map());
  const [removingTypingUsers,setRemovingTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeouts = useRef<Map<string,ReturnType<typeof setTimeout>>>(new Map());
  const [isConnecting, setIsConnecting] = useState(true);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const navigate = useNavigate();

  function saveSession() {
    const session: StoredSession = {
      roomCode: roomCodeRef.current,
      nickname: nicknameRef.current,
      sessionId: sessionId,
      timestamp: Date.now()
    }
    localStorage.setItem('chatSession',JSON.stringify(session))
  }
  function getSession(){
    const session: string|null = localStorage.getItem('chatSession')
    if(!session) return;
    return JSON.parse(session);
  }
  function lastMessageTime() {
    const stored = localStorage.getItem('roomMessages');
    if (!stored) return 0;
    
    const msgs = JSON.parse(stored);
    return msgs.length > 0 ? msgs[msgs.length - 1].time : 0;
  }
  function getLocalMsgs(){
    const stored = localStorage.getItem('roomMessages');
    if (!stored) return [];
    const msgs = JSON.parse(stored);
    return msgs;
  }
  function trimMessagesToLast100(messages: any[]) {
    if (messages.length > 100) {
      return messages.slice(-100);
    }
    return messages;
  }

  function handleTyping() {
    const now = Date.now();
    const currentMsg = msgRef.current?.value || '';
    
    if (!lastTypingSent.current || now - lastTypingSent.current >= 500) {
      if (currentMsg.length > 0) {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
        
        ws.current.send(JSON.stringify({
          type: "typing",
          payload: { sessionId }
        }));
        lastTypingSent.current = now;
      }
    }
  }
  useEffect(() => {
    if (userCount === 1 && !hasAutoShownRef.current) {
      setShowShareModal(true);
      hasAutoShownRef.current = true;
    }
  }, [userCount]);

  useEffect(() => {
    // Handle mobile app backgrounding - auto-refresh on resume
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isReady) {
        // Check if on mobile device
        const isMobile = /iPhone|iPad|Android|Mobile/.test(navigator.userAgent);
        if (isMobile) {
          console.log('Mobile app resumed, refreshing to reconnect...');
          window.location.reload();
        }
      }
    };

    // Fallback for app switching on some mobile browsers
    const handlePageShow = () => {
      if (isReady) {
        const isMobile = /iPhone|iPad|Android|Mobile/.test(navigator.userAgent);
        if (isMobile) {
          console.log('Page show event on mobile, refreshing to reconnect...');
          window.location.reload();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [isReady]);

  useEffect(()=>{
    if (isFirstRender) {
      // Instant scroll for first load (no animation)
      msgsEndRef.current?.scrollIntoView();
    } else {
      // Smooth scroll for subsequent messages
      msgsEndRef.current?.scrollIntoView({behavior:"smooth"});
    }
  },[typingUsers,msgs])

  // Set first render to false after initial messages are loaded and scrolled
  useEffect(() => {
    if (isFirstRender && msgs.length > 0) {
      // Use setTimeout to ensure scroll happens first
      setTimeout(() => {
        setIsFirstRender(false);
      }, 100);
    }
  }, [msgs, isFirstRender]);


  useEffect(()=>{
    try{
      const params = new URLSearchParams(window.location.search);
      const queryRoomCode = params.get('roomCode');
      const roomCodeToUse = paramRoomCode || queryRoomCode;
      
      const mountData = sessionStorage.getItem('newChatSession');
      
      // If roomCode exists but no session data, show username modal
      if (roomCodeToUse && !mountData) {
        setShowUsernameModal(true);
        return;
      }
      
      // No roomCode and no session - redirect home
      if (!roomCodeToUse && !mountData) {
        navigate('/');
        return;
      }
      
      // Has session data, continue with room setup
      if (!mountData) {
        return;
      }
      
      const data = JSON.parse(mountData);
      
      // IMPORTANT: Check if roomCode matches - if different, clear old session and messages
      if (roomCodeToUse && data.roomCode !== roomCodeToUse) {
        sessionStorage.removeItem('newChatSession');
        localStorage.removeItem('roomMessages');
        setShowUsernameModal(true);
        return;
      }
      
      const stored = getSession();
      if (stored && stored.roomCode !== data.roomCode) {
          localStorage.removeItem('roomMessages');
      }
      roomCodeRef.current = data.roomCode;
      nicknameRef.current = data.nickname;
      setIsReady(true);
   
        ws.current = new WebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:8080');
       
        ws.current.onopen = ()=>{ 
            if(!ws.current) return;
            if (ws.current.readyState !== WebSocket.OPEN) return;
            // In joined handler delete msgs if it belongs to old room
            if (data.roomCode !== roomCodeRef.current) {
                localStorage.removeItem('roomMessages');
            }
            ws.current.send(JSON.stringify({
              type: "join",
              payload: {
                //check wts better to send here from local storage or from here smwereelse 
                roomCode: data.roomCode,
                username: data.nickname,
                sessionId: sessionId,
                lastMessageTime: lastMessageTime()
              }
            }))
            
        }
        
        ws.current.onmessage = (e)=>{
            const data = JSON.parse(e.data);
            if(!data) return;
            if(data.type == "error"){
                const {message} = data.payload;
                if(message.includes('Room closed')){
                  setShowAlert(true);
                  setAlertMessage("Room closed, Please create a new room");
                  setAlertType('error');
                  localStorage.removeItem('roomMessages');
                  setTimeout(()=>{
                      navigate('/'); 
                      return;
                  },800)
                }else{
                  setShowAlert(true);
                  setAlertMessage(message);
                  setAlertType('error');
                }
            }
            else if(data.type == "joined"){
                const {userCount,msgs} = data.payload;
                setUserCount(userCount);
                // setShowAlert(true);
                // setAlertMessage("Joined the room");
                // setAlertType('success');
                //write logic for storedMsgs
                const oldMsgs = getLocalMsgs();
                const allMsgs = [...oldMsgs, ...msgs]
                const trimmedMsgs = trimMessagesToLast100(allMsgs);
                localStorage.setItem('roomMessages',JSON.stringify(trimmedMsgs))

                const transformedMsgs = (trimmedMsgs || []).map((m: any) => {
                    const date = new Date(m.time);
                    return {
                        user: m.user,
                        msg: m.msg,
                        hours: date.getHours(),
                        minutes: date.getMinutes(),
                        isSelf: m.sessionId === sessionId,
                        status: m.sessionId === sessionId ? ('sent' as const) : undefined,
                        timestamp: m.time
                    };
                });
                setMsgs((prev) => [...prev, ...transformedMsgs]);
                // Hide loader immediately on successful join
                setIsConnecting(false);
                saveSession();
            }
            else if(data.type == "user-joined"){
                const {user,userCount} = data.payload;
                setUserCount(userCount);
                setShowAlert(true);
                setAlertMessage(user+" joined the room");
                setAlertType('info');
            }
            else if(data.type == 'user-left'){
                const {user,userCount} = data.payload;
                setUserCount(userCount);
                setShowAlert(true);
                setAlertMessage(user+" left the room");
                setAlertType('info');
            }
            else if(data.type == 'message'){
                const {time,msg,user,sessionId:msgSessionId} = data.payload;

                //store the message recieved on local storage as well
                const backendMsg = {
                    msg,
                    user,
                    time,
                    sessionId: msgSessionId
                };
                const currentMsgs = getLocalMsgs();
                const updatedMsgs = [...currentMsgs, backendMsg];
                const trimmedMsgs = trimMessagesToLast100(updatedMsgs);
                localStorage.setItem('roomMessages', JSON.stringify(trimmedMsgs));

                //render for ui format 
                const date = new Date(time);
                const hours = date.getHours();
                const minutes = date.getMinutes();
                const isSelf = msgSessionId === sessionId;
                
                if (isSelf) {
                  // Update existing 'sending' message to 'sent'
                  setMsgs((prevMsgs) => {
                    const foundIndex = prevMsgs.findIndex(
                      (m) => m.isSelf && m.msg === msg && m.status === 'sending' && (time - m.timestamp < 10000)
                    );
                    if (foundIndex !== -1) {
                      const updated = [...prevMsgs];
                      updated[foundIndex] = {
                        ...updated[foundIndex],
                        status: 'sent' as const,
                        timestamp: time
                      };
                      return updated;
                    }
                    // Fallback: add as sent if optimistic not found
                    return [...prevMsgs, {user,msg,hours,minutes,isSelf,status:'sent' as const,timestamp:time}];
                  });
                } else {
                  // Other user's message
                  setMsgs((m)=>[...m,{user,msg,hours,minutes,isSelf,timestamp:time}]);
                }
                
                // Remove typing indicator when user sends a message
                setTypingUsers(prev => {
                  const updated = new Map(prev);
                  updated.delete(msgSessionId);
                  return updated;
                });
                if (typingTimeouts.current.has(msgSessionId)) {
                  clearTimeout(typingTimeouts.current.get(msgSessionId));
                  typingTimeouts.current.delete(msgSessionId);
                }
            }
            else if(data.type == 'typing'){
              const {user,sessionId: typingSessionId} = data.payload;

              if(typingTimeouts.current.has(typingSessionId))
                clearTimeout(typingTimeouts.current.get(typingSessionId));

              setTypingUsers(prev => {
                  const updated = new Map(prev);
                  updated.set(typingSessionId, {user, timestamp: Date.now()});
                  
                  // Keep only top 3 users (remove oldest)
                  if (updated.size > 3) {
                      const oldest = Array.from(updated.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
                      updated.delete(oldest[0]);
                  }
                  return updated;
              });
              
              // Auto-clear after 3 seconds
              const timeout = setTimeout(() => {
                  // First, mark as removing (triggers fade-out)
                  setRemovingTypingUsers(prev => new Set(prev).add(typingSessionId));
                  
                  // Then remove after fade animation completes (300ms)
                  setTimeout(() => {
                      setTypingUsers(prev => {
                          const updated = new Map(prev);
                          updated.delete(typingSessionId);
                          return updated;
                      });
                      setRemovingTypingUsers(prev => {
                          const updated = new Set(prev);
                          updated.delete(typingSessionId);
                          return updated;
                      });
                      typingTimeouts.current.delete(typingSessionId);
                  }, 300);
              }, 3000);
              
              typingTimeouts.current.set(typingSessionId, timeout);
            }
        }
    }catch(e){
        console.log(e)
    }
    return()=>{
        ws.current?.close();
      }
  },[])

  if (!isReady) {
    if (showUsernameModal) {
      return (
        <section className="min-h-screen bg-[#080605] flex items-center justify-center px-3">
          <Glow></Glow>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-8 max-w-sm w-full">
            <h2 className="text-white text-2xl font-ntbricksans mb-4">Join Room</h2>
            <p className="text-white/70 text-sm mb-6">Enter your username to join the chat</p>
            <input
              ref={usernameInputRef}
              type="text"
              placeholder="Enter username"
              className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-2 text-white placeholder-neutral-500 mb-6 focus:outline-none focus:border-neutral-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleJoinWithUsername();
                }
              }}
            />
            <button
              onClick={handleJoinWithUsername}
              className="w-full bg-[#FFFAED] text-black font-semibold py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Join Room
            </button>
          </div>
        </section>
      );
    }
    return null;
  }

  function sendMessage(){
    if(!ws.current) return;
    if (ws.current.readyState !== WebSocket.OPEN) return;
    if(!msgRef.current) return;
    const msg = msgRef.current.value;
    if (!msg.trim()) return;
    
    // Get current time for optimistic message
    const now = Date.now();
    const date = new Date(now);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    // Add message optimistically with 'sending' status
    const optimisticMsg = {
      user: nicknameRef.current,
      msg,
      hours,
      minutes,
      isSelf: true,
      status: 'sending' as const,
      timestamp: now
    };
    setMsgs((prev) => [...prev, optimisticMsg]);
    
    // Send to server
    ws.current.send(JSON.stringify({
        type:"message",
        payload:{
            msg,
            sessionId: sessionId
        }
    }))
    
    // Clear input and maintain focus - mobile-optimized approach
    msgRef.current.value = "";
    // Force focus using native DOM method for better mobile compatibility
    if (msgRef.current) {
      msgRef.current.focus();
      // Ensure cursor is at the end
      msgRef.current.setSelectionRange(0, 0);
    }
  }

  function leaveRoom() {
    ws.current?.close();
    localStorage.removeItem('roomMessages');
    localStorage.removeItem('chatSession');
    sessionStorage.removeItem('newChatSession');
    navigate('/');
  }

  function copyLink() {
    const url = `${window.location.origin}/room/${roomCodeRef.current}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Anonymous Rooms',
        url: url
      }).catch((err) => {
        console.log('Share failed, showing modal:', err);
        setShowShareModal(true);
      });
    } else {
      // No share API, show modal
      setShowShareModal(true);
    }
  }

  function handleJoinWithUsername() {
    if (!usernameInputRef.current?.value.trim()) {
      setShowAlert(true);
      setAlertMessage('Please enter a username');
      setAlertType('error');
      return;
    }

    const roomCodeToUse = paramRoomCode || new URLSearchParams(window.location.search).get('roomCode');
    
    if (roomCodeToUse) {
      const newSession: StoredSession = {
        roomCode: roomCodeToUse,
        nickname: usernameInputRef.current.value,
        sessionId: sessionId,
        timestamp: Date.now()
      };
      sessionStorage.setItem('newChatSession', JSON.stringify(newSession));
      setShowUsernameModal(false);
      window.location.reload();
    }
  }

  return (
    <section className="min-h-screen bg-[#080605] pb-0 md:pb-auto">
      {showAlert && (
        <Alert 
          message={alertMessage}
          type={alertType}
          onClose={() => setShowAlert(false)}
        />
      )}
      <ShareLinkModal 
        isOpen={showShareModal}
        roomCode={roomCodeRef.current}
        onClose={() => setShowShareModal(false)}
        onCopy={() => {
          setShowAlert(true);
          setAlertMessage('Link copied!');
          setAlertType('success');
          setShowShareModal(false);
        }}
      />
      <LoadingOverlay isLoading={isConnecting} />
      <Glow></Glow>
      <div className="flex flex-col items-center justify-end md:justify-center min-h-screen px-1 sm:px-6 lg:px-8 pb-0 md:pb-auto">
        <div className="w-full max-w-full md:max-w-1/2">
          <div className="flex flex-col items-start p-3 sm:p-6 md:p-8 rounded-2xl border border-solid border-neutral-700">
            <div className="flex items-center mb-3 gap-3 justify-between w-full">
              <div className="flex items-center gap-3">
                <ChatIcon></ChatIcon>
                <span className="text-[#FFF6E0] text-sm tracking-tight md:text-2xl font-ntbricksans">
                  {"Anonymous Rooms"}
                </span>
              </div>
              <button
                onClick={copyLink}
                className="text-white/70 hover:text-white text-xs flex items-center gap-1 transition-colors"
              >
                Share Link ↗
              </button>
            </div>
            <span className="text-white text-[10px] md:text-sm mb-5 font-sfmono opacity-70">
              {"temporary chats that disappears after all users exit"}
            </span>
            <div className="flex justify-between items-center bg-neutral-800 py-2 px-3 sm:px-5 mb-3.25 rounded-2xl border-0 w-full h-12">
              <span className="text-white/80 text-xs sm:text-sm">
                {`Room Code: ${roomCodeRef.current}`}
              </span>
              <span className="flex gap-2 sm:gap-4 items-center text-white/80 text-xs sm:text-sm">
                <span className="text-white/80 text-xs sm:text-sm">
                  {`Users ${userCount}`}
                </span>
                
                <button
                onClick={leaveRoom}
                className="hidden md:block px-4 py-1 text-s text-neutral-300 border border-neutral-600 rounded-[10px] hover:bg-neutral-900 transition-colors whitespace-nowrap"
              >
                Leave Room
              </button>
              </span>
              
              
            </div>
            
            <div className="flex md:hidden gap-2 w-full mb-1">
              <Button 
                width="w-full" 
                onClick={leaveRoom} 
                text="Leave Room" 
                variant="ghost"
              />
            </div>
            <div 
            className="flex flex-col w-full h-[55dvh] sm:h-[60dvh] p-3 sm:p-6 md:p-8 rounded-2xl border border-solid border-neutral-700 overflow-y-auto gap-3"
          >
              {msgs.map((m,i)=>(
                  <Message key={i} msg={m.msg} hours={m.hours} minutes={m.minutes} user={m.user} isSelf={m.isSelf} status={m.status}></Message>
              ))}
              {Array.from(typingUsers.values()).map((typingUser) => (
                  <TypingBubble key={typingUser.user} user={typingUser.user} isRemoving={removingTypingUsers.has(typingUser.user)} />
              ))}
              <div ref={msgsEndRef}></div>
          </div>
            <div className="flex flex-row mt-4 w-full gap-2 md:gap-2">
              <Input 
                width="w-5/6" 
                ref={msgRef} 
                placeholder="Type a message"
                onInput={handleTyping}
                disabled={isConnecting}
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                onBlur={() => {
                  // Prevent blur on mobile after sending message
                  setTimeout(() => {
                    if (document.activeElement !== msgRef.current) {
                      msgRef.current?.focus();
                    }
                  }, 10);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              ></Input>
              <span className="hidden md:block w-1/6">
              <Button width="w-full" onClick={sendMessage} text={"Send"} ></Button></span>
              <span className="block md:hidden w-1/6">
                <Button width="w-full" onClick={sendMessage} icon={<SendIcon></SendIcon>} ></Button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Room