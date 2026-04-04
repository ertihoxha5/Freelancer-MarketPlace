import background from '../assets/background.svg'
import {useState} from 'react';
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Link } from 'react-router-dom';

function ForgotPassword(){
    const [showPassword, setShowPassword] = useState(false);
    return(
        <div className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center select-none" style={{ backgroundImage: `url(${background})` }}>
            <form className="bg-white flex flex-col ml-50 h-fit w-100 rounded-lg px-8">
                <h1 className='text-3xl text-center mt-8'>Change Password</h1>
                <label className='text-xl mt-10 mb-2'>Email</label>
                <input type="email" className="w-full rounded-lg border border-[#ac9f9f] px-3 py-2" />
                <label className='text-xl mt-2 mb-2'>New Password</label>
                <div className="relative w-full">
                    <input type={showPassword ? 'text' : 'password'} className="w-full rounded-lg border border-[#ac9f9f] px-3 py-2 pr-10"/>
                    <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600 hover:text-gray-800" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                    </button>
                </div>
                <label className='text-xl mt-2 mb-2'>Confirm New Password</label>
                <div className="relative w-full">
                    <input type={showPassword ? 'text' : 'password'} className="w-full rounded-lg border border-[#ac9f9f] px-3 py-2 pr-10"/>
                    <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600 hover:text-gray-800" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                    </button>
                </div>
                <button type="button" className='bg-[#3964C6] text-white py-2 text-2xl mt-10 rounded-lg mb-10 hover:scale-101 active:scale-99'>Change Password</button>
            </form>  
        </div>
    )
}

export default ForgotPassword