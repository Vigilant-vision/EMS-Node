// Function to generate complete image URL
const getImageURL = (imageName) => {
    return `http://15.207.55.174:8000/uploads/${imageName}`;
};

module.exports = getImageURL;