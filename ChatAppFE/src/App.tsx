import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Landing from './pages/Landing'
import Room from './pages/Room'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AuthCallback from './pages/AuthCallback'
import Profile from './pages/Profile'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path='/' element={<Landing></Landing>}></Route>
          <Route path='/login' element={<Login></Login>}></Route>
          <Route path='/signup' element={<Signup></Signup>}></Route>
          <Route path='/auth/callback' element={<AuthCallback></AuthCallback>}></Route>
          <Route path='/room/:roomCode' element={<Room></Room>}></Route>
          <Route path='/profile' element={<Profile></Profile>}></Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
