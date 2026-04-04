import background from '../assets/background.svg'
import {useState} from 'react';
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Login() {
    const navigate = useNavigate();
    const { signIn } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false)
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        email:'',
        password:''
    })

    function updateField(name, value) {
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError('');
    }

    async function handleSubmit(e){
        e.preventDefault()
        setError('')

        const payload = {
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
        };
        setSubmitting(true);
        try {
            await signIn(payload);
            navigate('/demo-protected', { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed.');
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center select-none" style={{ backgroundImage: `url(${background})` }}>
            <form className="bg-white flex flex-col ml-50 h-fit w-100 rounded-lg px-8" onSubmit={handleSubmit}>
                <h1 className='text-3xl text-center mt-8'>Login to your account</h1>
                <label className='text-xl mt-10 mb-2'>Email</label>
                <input type="email" className="w-full rounded-lg border border-[#ac9f9f] px-3 py-2" name='email' onChange={(e) => updateField(e.target.name, e.target.value)} />
                <label className='text-xl mt-2 mb-2'>Password</label>
                <div className="relative w-full">
                    <input type={showPassword ? 'text' : 'password'} className="w-full rounded-lg border border-[#ac9f9f] px-3 py-2 pr-10" name='password' onChange={(e) => updateField(e.target.name, e.target.value)}/>
                    <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600 hover:text-gray-800" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                    </button>
                </div>
                <div className='flex flex-row items-center mt-3 mx-0.5 justify-between'>
                    <div className='flex items-center'>
                        <input type='checkbox' checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className='w-4 h-4 accent-[#3964c6] border-[#ac9f9f]'></input>
                        <label className='pl-1'>Remember Me</label>
                    </div>
                    <Link to='/forgotpassword' className='text-[#3964C6] hover:text-[#2F52A3]'>Forgot Password?</Link>
                </div>
                {error ? <p className="text-red-600 text-sm mt-8 text-center" role="alert">{error}</p> : null}
                <button type="submit" className='bg-[#3964C6] text-white py-2 text-2xl mt-8 rounded-lg mb-14 hover:scale-101 active:scale-99'>{submitting ? 'Logging In…' : 'Login'}</button>
            </form>  
        </div>
    )
}

export default Login;