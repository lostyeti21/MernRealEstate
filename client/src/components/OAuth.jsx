import React from 'react'
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { app } from '../firebase';
import { useDispatch } from "react-redux";
import {useNavigate} from "react-router-dom";
import { signInSuccess } from "../redux/user/userSlice.js";

const OAuth = () => {

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleGoogleClick = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const auth = getAuth(app)

            const result = await signInWithPopup(auth, provider);

            const res = await fetch("api/auth/google", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: result.user.displayName,
                    email: result.user.email,
                    photo: result.user.photoURL,
                }),
            });

            const data = await res.json();

            dispatch(signInSuccess(data));
            navigate("/");



            console.log(result);

        } catch (error) {
            console.log('Couldnt sign in with Google', error);
        }

    };

    return (
        <button onClick={handleGoogleClick} type="button" className='bg-red-700 text-white p-3 rounde-lg uppercase hover:opacity-95'>
            Continue with Google
        </button>
    )
}

export default OAuth