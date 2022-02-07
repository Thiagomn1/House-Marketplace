import { useState, useEffect, useRef } from "react"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage"
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { useNavigate, useParams } from "react-router-dom"
import Spinner from "../components/Spinner"
import { db } from "../firebase.config"
import { v4 as uuidv4 } from "uuid"
import { toast } from "react-toastify"

function EditListing() {
  const [loading, setLoading] = useState(false)
  //eslint-disable-next-line
  const [ToggleGeolocation, setToggleGeolocation] = useState(true)
  const [listing, setListing] = useState(false)
  const [formData, setFormData] = useState({
    type: "rent",
    name: "",
    bedrooms: 1,
    bathrooms: 1,
    parking: false,
    furnished: false,
    address: "",
    offer: false,
    regularPrice: 0,
    discountedPrice: 0,
    images: {},
    latitude: 0,
    longitude: 0,
  })

  const {
    type,
    name,
    bedrooms,
    bathrooms,
    parking,
    furnished,
    address,
    offer,
    regularPrice,
    discountedPrice,
    images,
    latitude,
    longitude,
  } = formData

  const auth = getAuth()
  const navigate = useNavigate()
  const params = useParams()
  const isMounted = useRef(true)

  useEffect(() => {
    setLoading(true)
    const fetchListing = async () => {
      const docRef = doc(db, "listings", params.listingId)
      const docSnapshot = await getDoc(docRef)

      if (docSnapshot.exists()) {
        setListing(docSnapshot.data())
        setFormData({
          ...docSnapshot.data(),
          address: docSnapshot.data().location,
        })
        setLoading(false)
      } else {
        navigate("/")
        toast.error("Listing does not exist")
      }
    }
    fetchListing()
  }, [params.listingId, navigate])

  useEffect(() => {
    if (listing && listing.userRef !== auth.currentUser.uid) {
      toast.error("You can't edit that listing")
      navigate("/")
    }
  })

  useEffect(() => {
    if (isMounted) {
      onAuthStateChanged(auth, user => {
        if (user) {
          setFormData({ ...formData, userRef: user.uid })
        } else {
          navigate("/sign-in")
        }
      })
    }

    return () => {
      isMounted.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted])

  const onSubmit = async event => {
    event.preventDefault()

    setLoading(true)

    if (discountedPrice >= regularPrice) {
      setLoading(false)
      toast.error("Discounted Price cannot be higher than the Regular Price")
      return
    }

    if (images.length > 6) {
      setLoading(false)
      toast.error("Maximum of 6 images allowed")
      return
    }

    let geolocation = {}
    let location

    if (ToggleGeolocation) {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${process.env.REACT_APP_GEOCODE_APIKEY}`
      )

      const data = await response.json()

      geolocation.lat = data.results[0]?.geometry.location.lat ?? 0
      geolocation.lng = data.results[0]?.geometry.location.lng ?? 0

      location =
        data.status === "ZERO_RESULTS"
          ? undefined
          : data.results[0]?.formatted_address

      if (location === undefined || location.includes("undefined")) {
        toast.error("Please enter a valid address")
        setLoading(false)
        return
      }
    } else {
      geolocation.lat = latitude
      geolocation.lng = longitude
    }

    const storeImage = async image => {
      return new Promise((resolve, reject) => {
        const storage = getStorage()
        const fileName = `${auth.currentUser.uid}-${image.name}-${uuidv4()}`

        const storageRef = ref(storage, "images/" + fileName)

        const uploadTask = uploadBytesResumable(storageRef, image)

        uploadTask.on(
          "state_changed",
          snapshot => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            console.log("Upload is " + progress + "% done")
          },
          error => {
            reject(error)
          },
          () => {
            getDownloadURL(uploadTask.snapshot.ref).then(downloadURL => {
              resolve(downloadURL)
            })
          }
        )
      })
    }

    const imgUrls = await Promise.all(
      [...images].map(image => storeImage(image))
    ).catch(() => {
      setLoading(false)
      toast.error("Images not uploaded")
      return
    })

    const dataCopy = {
      ...formData,
      imgUrls,
      geolocation,
      timestamp: serverTimestamp(),
    }

    dataCopy.location = address
    delete dataCopy.images
    delete dataCopy.address
    !dataCopy.offer && delete dataCopy.discountedPrice

    const docRef = doc(db, "listings", params.listingId)
    await updateDoc(docRef, dataCopy)
    setLoading(false)
    toast.success("Listing edited successfully")
    navigate(`/category/${dataCopy.type}/${docRef.id}`)
  }

  const onMutate = event => {
    let boolean = null
    if (event.target.value === "true") {
      boolean = true
    }
    if (event.target.value === "false") {
      boolean = false
    }

    if (event.target.files) {
      setFormData(prevState => ({
        ...prevState,
        images: event.target.files,
      }))
    }

    if (!event.target.files) {
      setFormData(prevState => ({
        ...prevState,
        [event.target.id]: boolean ?? event.target.value,
      }))
    }
  }

  if (loading) {
    return <Spinner />
  }

  return (
    <div className="profile">
      <header>
        <p className="pageHeader">Edit Listing</p>
      </header>
      <main>
        <form onSubmit={onSubmit}>
          <label className="formLabel"> Sell / Rent</label>
          <div className="formButtons">
            <button
              type="button"
              className={type === "sale" ? "formButtonActive" : "formButton"}
              id="type"
              value="sale"
              onClick={onMutate}
            >
              Sell
            </button>
            <button
              type="button"
              className={type === "rent" ? "formButtonActive" : "formButton"}
              id="type"
              value="rent"
              onClick={onMutate}
            >
              Rent
            </button>
          </div>

          <label className="formLabel">Name</label>
          <input
            type="text"
            className="formInputName"
            id="name"
            value={name}
            onChange={onMutate}
            maxLength="32"
            minLength="10"
            required
          />

          <div className="formRooms flex">
            <div>
              <label className="formLabel">Bedrooms</label>
              <input
                type="number"
                className="formInputSmall"
                id="bedrooms"
                value={bedrooms}
                onChange={onMutate}
                min="1"
                max="50"
                required
              />
            </div>
            <div>
              <label className="formLabel">Bathrooms</label>
              <input
                type="number"
                className="formInputSmall"
                id="bathrooms"
                value={bathrooms}
                onChange={onMutate}
                min="1"
                max="50"
                required
              />
            </div>
          </div>

          <label className="formLabel">Parking Spot</label>
          <div className="formButtons">
            <button
              className={parking ? "formButtonActive" : "formButton"}
              type="button"
              id="parking"
              value={true}
              onClick={onMutate}
              min="1"
              max="50"
            >
              Yes
            </button>
            <button
              className={
                !parking && parking !== null ? "formButtonActive" : "formButton"
              }
              type="button"
              id="parking"
              value={false}
              onClick={onMutate}
              min="1"
              max="50"
            >
              No
            </button>
          </div>

          <label className="formLabel">Furnished</label>
          <div className="formButtons">
            <button
              className={furnished ? "formButtonActive" : "formButton"}
              type="button"
              id="furnished"
              value={true}
              onClick={onMutate}
              min="1"
              max="50"
            >
              Yes
            </button>
            <button
              className={
                !furnished && furnished !== null
                  ? "formButtonActive"
                  : "formButton"
              }
              type="button"
              id="furnished"
              value={false}
              onClick={onMutate}
              min="1"
              max="50"
            >
              No
            </button>
          </div>

          <label className="formLabel">Address</label>
          <textarea
            type="text"
            id="address"
            className="formInputAddress"
            value={address}
            onChange={onMutate}
            required
          ></textarea>

          {!ToggleGeolocation && (
            <div className="formLatLng flex">
              <div>
                <label className="formLabel">Latitude</label>
                <input
                  type="number"
                  id="latitude"
                  value={latitude}
                  onChange={onMutate}
                  className="formInputSmall"
                  required
                />
              </div>
              <div>
                <label className="formLabel">Longitude</label>
                <input
                  type="number"
                  id="longitude"
                  value={longitude}
                  onChange={onMutate}
                  className="formInputSmall"
                  required
                />
              </div>
            </div>
          )}

          <label className="formLabel">Offer</label>
          <div className="formButtons">
            <button
              className={offer ? "formButtonActive" : "formButton"}
              type="button"
              id="offer"
              value={true}
              onClick={onMutate}
            >
              Yes
            </button>
            <button
              className={
                !offer && offer !== null ? "formButtonActive" : "formButton"
              }
              type="button"
              id="offer"
              value={false}
              onClick={onMutate}
            >
              No
            </button>
          </div>

          <label className="formLabel">Regular Price</label>
          <div className="formPriceDiv">
            <input
              type="number"
              id="regularPrice"
              value={regularPrice}
              onChange={onMutate}
              min="50"
              max="75000000"
              className="formInputSmall"
              required
            />
            {type === "rent" && <p className="formPriceText">$ / Month</p>}
          </div>

          {offer && (
            <>
              <label className="formLabel">Discounted Price</label>
              <input
                type="number"
                id="discountedPrice"
                value={discountedPrice}
                onChange={onMutate}
                min="50"
                max="75000000"
                className="formInputSmall"
                required
              />
            </>
          )}

          <label className="formLabel">Images</label>
          <p className="imagesInfo">
            The first image will be the cover (max 6 images)
          </p>
          <input
            type="file"
            id="images"
            onChange={onMutate}
            max="6"
            accept=".jpg,.png,.jpeg"
            className="formInputFile"
            multiple
            required
          />
          <button className="primaryButton createListingButton" type="submit">
            Edit Listing
          </button>
        </form>
      </main>
    </div>
  )
}

export default EditListing
