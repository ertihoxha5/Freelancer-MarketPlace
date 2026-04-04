import background from '../assets/background.svg'
import {useState} from 'react'
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Link } from 'react-router-dom';


function Register(){
    const [showPassword, setShowPassword] = useState(false);
    const [roleID, setRoleID] = useState();
    return (
        <div className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center select-none" style={{ backgroundImage: `url(${background})` }}>
            <form className="bg-white flex flex-col ml-50 h-fit w-100 rounded-lg px-8">
                <h1 className='text-3xl text-center mt-8'>Create Account</h1>
                <label className='text-xl mt-8'>Full Name</label>
                <input type="email" className="w-full rounded-lg border border-[#ac9f9f] px-3 py-2" />
                <label className='text-xl mt-2'>Email</label>
                <input type="email" className="w-full rounded-lg border border-[#ac9f9f] px-3 py-2" />
                <label className='text-xl mt-2'>Password</label>
                <div className="relative w-full">
                    <input type={showPassword ? 'text' : 'password'} className="w-full rounded-lg border border-[#ac9f9f] px-3 py-2 pr-10"/>
                    <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600 hover:text-gray-800" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                    </button>
                </div>
                <label className='text-xl mt-2'>Confirm Password</label>
                <div className="relative w-full">
                    <input type={showPassword ? 'text' : 'password'} className="w-full rounded-lg border border-[#ac9f9f] px-3 py-2 pr-10"/>
                    <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600 hover:text-gray-800" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                    </button>
                </div>
                <div>
                    <h1 className='my-2 mx-1'>Select Role:</h1>
                    <div className='flex flex-row justify-between mx-1'>
                        <div className='flex items-center'>
                            <input type='radio' className='w-5 h-5 accent-[#3964c6] border-[#ac9f9f]' name='roleID' value='2' onChange={(e) => setRoleID(e.target.value)} checked={roleID==='2'}></input>
                            <label className='pl-1'>Client</label>
                        </div>
                        <div className='flex items-center'>
                            <input type='radio' className='w-5 h-5 accent-[#3964c6] border-[#ac9f9f]' name='roleID' value='3' onChange={(e) => setRoleID(e.target.value)} checked={roleID === '3'}></input>
                            <label className='pl-1'>Freelancer</label>
                        </div>
                    </div>
                </div>
                <button type="button" className='bg-[#3964C6] text-white py-2 text-2xl mt-10 rounded-lg hover:scale-101 active:scale-99'>Create Account</button>
                <div className='flex flex-row justify-center mt-2'>
                    <p className=''>Already have an account?</p>
                    <Link to='/login' className='ml-1 text-[#3964C6] hover:text-[#2F52A3] mb-10'>Login</Link>
                </div>
            </form>  
        </div>
    )
}

export default Register;