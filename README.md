# House Marketplace

Web application to find and list houses for sale or for rent, allowing users to register and login, add listings of their own and browse existing ones. This was a React/Firebase project developed during a React course 

# ⚙ Usage

## Geolocation

The listings use Google geocoding to get the coords from the address field. You need to add an .env with your own Google Geocode API key, or in the CreateListing.jsx file you can set geolocationEnabled to "false" and it will add a lat/lng field to the form.

## Run

- Install the dependencies of this project by running `npm install`
- Run the application with `npm start`
