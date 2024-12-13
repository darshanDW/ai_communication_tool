import React, { useEffect, useState } from 'react';
import "./VideosPage.css"
import ReactPlayer from 'react-player/lazy'
import { jwtDecode } from 'jwt-decode';
const VideosPage = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentVideoSrc, setCurrentVideoSrc] = useState("");
    const token = localStorage.getItem("token"); // Replace 'authToken' with the key used in your app
    const decodedToken = jwtDecode(token); // Decode the token
    const userid = decodedToken.userid;
    console.log(userid)

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const response = await fetch('https://ai-communication-tool.onrender.com/face/get_user_videos', {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",

                    },
                    body: JSON.stringify({ userid: '675c309c12f7b34784749b6c' }),
                });

                const data = await response.json();
                console.log(data)
                const sortedVideos = data.videos.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
                setVideos(sortedVideos);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching videos:', error);
                setLoading(false);
            }
        };

        fetchVideos();
    }, []);

    const handleVideoClick = (fileId) => {
        const videoUrl = `https://ai-communication-tool.onrender.com/${fileId}`;
        console.log(videoUrl);
        const anchor = document.createElement('a');
        anchor.href = videoUrl;
        anchor.download = "recorded.mp4"; // Optional: specify a default filename
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        // Create an invisible anchor element and trigger the download

    };


    if (loading) {
        return <div>Loading videos...</div>;
    }

    return (
        <div className="videos-container">
            <h1>Stored Videos</h1>
            <div className="videos-list">
                {videos.length === 0 ? (
                    <p>No videos found.</p>
                ) : (
                    videos.map((video) => (
                        <div key={video.file_id} className="video-item">
                            <h3
                                style={{ cursor: 'pointer', color: 'blue' }}
                            >
                                {video.filename}
                            </h3>
                            <p>Uploaded on: {new Date(video.upload_date).toLocaleString()}</p>

                            {/* Download Button */}
                            <button onClick={() => handleVideoClick(video.file_id)}>
                                Download Video
                            </button>


                        </div>

                    ))
                )}

            </div>
        </div>
    );
};


export default VideosPage;