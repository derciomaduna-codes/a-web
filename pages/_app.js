import "../styles/globals.css";
import Navbar from "../components/navbar";
import { USER_CONTEXT } from "../context/MainContext";
import { useContext, useState, useEffect } from "react";
import { Palette } from "@universemc/react-palette";
import Router from "next/router";
import Footer from "../components/footer/Footer";
import { Amplify, Auth } from "aws-amplify";
import { Hub, Logger } from "aws-amplify";
import { CurrentConfig } from "./../components/utils/CognitoConfig"; //added curly braces for import signinficance
import { FlashlightOnRounded } from "@mui/icons-material";
import axios from "axios";

import { ShowsProvider } from "../context/ShowContext";
import { FavouriteProvider } from "../context/addFavouriteContext";
import { API_INSTANCE } from "../config/api-instance";

function MyApp({ Component, pageProps }) {
  Amplify.configure(CurrentConfig); //moved this file inside the module

  const UserContext = useContext(USER_CONTEXT);
  const [selectedCategory, setSelectedCategory] = useState("None");
  const [user, setUser] = useState("Activetv@gmail.com");
  const [subCode, setSubCode] = useState("no-sub-user");
  const [displayName, setDisplayName] = useState("display name");
  const [loggedIn, setLoggedIn] = useState(false);
  const [authorisedJWT, setAuthorisedJWT] = useState("no token valid");
  const [avaters, setAvaters] = useState([]);
  const [imgProfile, setImgProfile] = useState("");
  const [isContained, setIsContained] = useState(false);
  const [picture, setPicture] = useState("");
  const [showsDetails, setShowsDetails] = useState({
    title: "",
    img: "imortal.webp",
    episodes: [],
  });
  const [userAccount, setUserAccount] = useState({ email: "", favourites: [] });
  const ForceReload = () => window.location.reload();
  const ForceRedirect = (direction) => (document.location.href = direction);
  let [loading, setLoading] = useState(false);
  let [color, setColor] = useState("#ffffff");

  //hub listeners
  Hub.listen("auth", (data) => {
    switch (data.payload.event) {
      case "signIn":
        console.log("user signed in " + data.payload.event);
        break;
      case "signUp":
        console.log("user signed up " + data.payload.event);
        break;
      case "signOut":
        console.log("user signed out " + data.payload.event);
        break;
      case "signIn_failure":
        console.log("user sign_in failed :" + data.payload.event);
        break;
      case "configured":
        console.log("the Auth module is configured " + data.payload.event);
    }
  });

  //test for federation
  const fetchUserInfo = (domain) => {
    // the original call  axios.get('https://<your-user-pool-domain>/oauth2/userInfo')
    axios
      .get(`https://${domain}/oauth2/userInfo`)
      .then((response) =>
        console.log(response, "fetching userInfo info with axios")
      )
      .catch((err) =>
        console.log("failing to fetch user from axios bcz", err.message)
      );
  };
  //updating attributes-or-change-the-values
  const updateAttributes = async (nameAttibute, emailAttribute) => {
    let user = await Auth.currentAuthenticatedUser().then((user) => user);

    await Auth.updateUserAttributes(user, {
      name: nameAttibute,
      email: emailAttribute,
    });
    await Router.push("/account");
    ForceReload();
  };

  //update user profile img
  const updatePictureAttribute = async (pictureAttribute) => {
    let user = await Auth.currentAuthenticatedUser().then((user) => user);

    await Auth.updateUserAttributes(user, {
      picture: pictureAttribute,
    });
    await Router.push("/account");
    ForceReload();
  };

  //storing user to dynamo db
  const storeUserToDynamo = async (user) => {
    console.log("checking if user exists...");
    if (!userAccount.email) {
      getUserFromDynamo(user.attributes.email);
    }
    if (userAccount.email) {
      return;
    } else if (!userAccount.email) {
      // this should only happen when it is a new user
      console.log("WELCOME NEW USER!!!");
      const res = await fetch(
        "https://p6x7b95wcd.execute-api.us-east-2.amazonaws.com/Prod/post-account",
        {
          method: "POST",
          body: JSON.stringify({
            email: user.attributes.email,
            displayName: user.attributes.name,
            favourites: [],
            points: 0,
            subscriptionType: "none",
            imageProfile: "",
          }),
        }
      );
      let data = await res.json();
      console.log("stored user", data);
    }
  };

  const checkUser = async () => {
    await Auth.currentAuthenticatedUser({
      bypassCache: false,
    })
      .then((user) => {
        //assign context variables
        const currentUser = user.attributes.email;
        const DisplayUser = user.attributes.name;
        const sub = user.attributes.sub;
        const picture = user.attributes.picture;

        //retrieve web-token
        const token = user.signInUserSession.idToken.jwtToken;
        setAuthorisedJWT(token);
        setSubCode(sub);
        console.log(authorisedJWT, "how to access jwt statefully");

        // our setters
        setUser(currentUser);
        setDisplayName(DisplayUser);
        setImgProfile(picture);
        setLoggedIn(true);

        //testing logs
        console.log("attributes::", user.attributes);
        console.log(user, "=> user in current authenticated");
        console.log("userEmail after succesfull login: ", currentUser);
        console.log("displayName after succesfull login: ", DisplayUser);

        //storing the user to dynamo db once sign up is successful
        storeUserToDynamo(user);
      })
      .catch((error) => {
        //error handling
        console.log("failed to get the existing user because ", error);
        setUser("Active-tv");
        setLoggedIn(false);
      });
  };

  const getUserFromDynamo = async (userEmail) => {
    if (userEmail === "Activetv@gmail.com" || userEmail === "Active-tv") return;
    const res = await axios.get(
      `https://p6x7b95wcd.execute-api.us-east-2.amazonaws.com/Prod/get-account/${userEmail}`
    );
    setUserAccount(res.data.user);
    console.log("user from dynamo", res.data);
  };

  useEffect(() => {
    checkUser();
  }, []);

  const [userSync, setUserSync] = useState(false);

  useEffect(() => {
    getUserFromDynamo(user);
  }, [userSync]);

  return (
    <USER_CONTEXT.Provider
      value={{
        isContained,
        setIsContained,
        updateAttributes,
        UserContext,
        imgProfile,
        setImgProfile,
        authorisedJWT,
        setAuthorisedJWT,
        displayName,
        selectedCategory,
        loggedIn,
        ForceReload,
        ForceRedirect,
        setLoggedIn,
        setUser,
        setSelectedCategory,
        showsDetails,
        setShowsDetails,
        subCode,
        setSubCode,
        avaters,
        setAvaters,
        picture,
        setPicture,
        updatePictureAttribute,
        AuthenticatedUser: {
          name: user,
          email: user,
        },
        userAccount,
        userSync,
        setUserSync,
        loading,
        setLoading,
        color,
        setColor,
      }}
    >
      <FavouriteProvider>
        <Navbar />

        <ShowsProvider>
          <Component {...pageProps} />
        </ShowsProvider>
        <Footer />
      </FavouriteProvider>
    </USER_CONTEXT.Provider>
  );
}

export default MyApp;
