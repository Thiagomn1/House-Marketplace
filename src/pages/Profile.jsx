import { getAuth, updateProfile } from "firebase/auth"
import {
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
} from "firebase/firestore"
import { db } from "../firebase.config"
import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { toast } from "react-toastify"
import ListingItem from "../components/Listing"
import ArrowRight from "../assets/svg/keyboardArrowRightIcon.svg"
import HomeIcon from "../assets/svg/homeIcon.svg"

function Profile() {
  const auth = getAuth()
  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState(null)
  const [changeDetails, setChangeDetails] = useState(false)
  const [formData, setFormData] = useState({
    name: auth.currentUser.displayName,
    email: auth.currentUser.email,
  })
  const { name, email } = formData

  const navigate = useNavigate()

  useEffect(() => {
    const fetchUserListings = async () => {
      const listingsRef = collection(db, "listings")
      const q = query(
        listingsRef,
        where("userRef", "==", auth.currentUser.uid),
        orderBy("timestamp", "desc")
      )
      const querySnapshot = await getDocs(q)

      let listings = []

      querySnapshot.forEach(doc =>
        listings.push({
          id: doc.id,
          data: doc.data(),
        })
      )

      setListings(listings)
      setLoading(false)
    }
    fetchUserListings()
  }, [auth.currentUser.uid])

  const onLogout = () => {
    auth.signOut()
    navigate("/")
  }

  const onSubmit = async () => {
    try {
      if (auth.currentUser.displayName !== name) {
        await updateProfile(auth.currentUser, {
          displayName: name,
        })

        const userRef = doc(db, "users", auth.currentUser.uid)
        await updateDoc(userRef, {
          name,
        })
      }
    } catch (error) {
      toast.error("Couldn't update profile details")
    }
  }

  const onChange = event => {
    setFormData(prevState => ({
      ...prevState,
      [event.target.id]: event.target.value,
    }))
  }

  const onDelete = async listingId => {
    if (window.confirm("Do you want to delete?")) {
      await deleteDoc(doc(db, "listings", listingId))
      const updatedListings = listings.filter(
        listing => listing.id !== listingId
      )
      setListings(updatedListings)
      toast.success("Listing deleted successfully")
    }
  }

  return (
    <div className="profile">
      <header className="profileHeader">
        <p className="pageHeader">My Profile</p>
        <button type="button" className="logOut" onClick={onLogout}>
          Logout
        </button>
      </header>
      <main>
        <div className="profileDetailsHeader">
          <p className="profileDetailsText">Personal Details</p>
          <p
            className="changePersonalDetails"
            onClick={() => {
              changeDetails && onSubmit()
              setChangeDetails(prevState => !prevState)
            }}
          >
            {changeDetails ? "Done" : "Change"}
          </p>
        </div>
        <div className="profileCard">
          <form>
            <input
              type="text"
              id="name"
              className={!changeDetails ? "profileName" : "profileNameActive"}
              disabled={!changeDetails}
              value={name}
              onChange={onChange}
            />
            <input
              type="text"
              id="email"
              className={!changeDetails ? "profileEmail" : "profileEmailActive"}
              disabled={!changeDetails}
              value={email}
              onChange={onChange}
            />
          </form>
        </div>

        <Link to="/create-listing" className="createListing">
          <img src={HomeIcon} alt="home" />
          <p>Sell or Rent your home</p>
          <img src={ArrowRight} alt="arrow right" />
        </Link>

        {!loading && listings?.length > 0 && (
          <>
            <p className="listingText">Your Listings</p>
            <ul className="listingsList">
              {listings.map(listing => (
                <ListingItem
                  key={listing.id}
                  listing={listing.data}
                  id={listing.id}
                  onDelete={() => onDelete(listing.id)}
                />
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  )
}

export default Profile
