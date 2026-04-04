import background from '../assets/background.svg'
import { useState } from 'react'
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../apiServices';


function Register(){
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        roleID: '',
    });

    function updateField(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
        setError('');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (!form.roleID) {
            setError('Please select Client or Freelancer.');
            return;
        }
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        const payload = {
            fullName: form.fullName.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            roleID: Number(form.roleID),
        };
        setSubmitting(true);
        try {
            await registerUser(payload);
            navigate('/login');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed.');
        } finally {
            setSubmitting(false);
        }
    }

    
    return (
        <div className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center select-none" style={{ backgroundImage: `url(${background})` }}>
            <form className="bg-white flex flex-col ml-50 h-fit w-100 rounded-lg px-8" onSubmit={handleSubmit}>
                <h1 className='text-3xl text-center mt-8'>Create Account</h1>
                <label className='text-xl mt-8'>Full Name</label>
                <input
                    type="text"
                    autoComplete="name"
                    className="w-full rounded-lg border border-[#ac9f9f] px-3 py-2"
                    value={form.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    required
                />
                <label className='text-xl mt-2'>Email</label>
                <input
                    type="email"
                    autoComplete="email"
                    className="w-full rounded-lg border border-[#ac9f9f] px-3 py-2"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    required
                />
                <label className='text-xl mt-2'>Password</label>
                <div className="relative w-full">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className="w-full rounded-lg border border-[#ac9f9f] px-3 py-2 pr-10"
                        value={form.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        required
                        minLength={8}
                    />
                    <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600 hover:text-gray-800" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                    </button>
                </div>
                <label className='text-xl mt-2'>Confirm Password</label>
                <div className="relative w-full">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className="w-full rounded-lg border border-[#ac9f9f] px-3 py-2 pr-10"
                        value={form.confirmPassword}
                        onChange={(e) => updateField('confirmPassword', e.target.value)}
                        required
                        minLength={8}
                    />
                    <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600 hover:text-gray-800" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                    </button>
                </div>
                <div>
                    <h1 className='my-2 mx-1'>Select Role:</h1>
                    <div className='flex flex-row justify-between mx-1'>
                        <div className='flex items-center'>
                            <input type='radio' className='w-5 h-5 accent-[#3964c6] border-[#ac9f9f]' name='roleID' value='2' onChange={(e) => updateField('roleID', e.target.value)} checked={form.roleID==='2'}></input>
                            <label className='pl-1'>Client</label>
                        </div>
                        <div className='flex items-center'>
                            <input type='radio' className='w-5 h-5 accent-[#3964c6] border-[#ac9f9f]' name='roleID' value='3' onChange={(e) => updateField('roleID', e.target.value)} checked={form.roleID === '3'}></input>
                            <label className='pl-1'>Freelancer</label>
                        </div>
                    </div>
                </div>
                {error ? <p className="text-red-600 text-sm mt-4 text-center" role="alert">{error}</p> : null}
                <button type="submit" disabled={submitting} className='bg-[#3964C6] text-white py-2 text-2xl mt-4 rounded-lg hover:scale-101 active:scale-99 disabled:opacity-60'>
                    {submitting ? 'Creating…' : 'Create Account'}
                </button>
                <div className='flex flex-row justify-center mt-2'>
                    <p className=''>Already have an account?</p>
                    <Link to='/login' className='ml-1 text-[#3964C6] hover:text-[#2F52A3] mb-10'>Login</Link>
                </div>
            </form>  
        </div>
    )
}

export default Register;
