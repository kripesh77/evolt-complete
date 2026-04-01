import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Get Cloudinary configuration for client-side upload
 * The frontend will use these to upload directly to Cloudinary
 */
export function getCloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
  };
}

// Helper function to delete image from Cloudinary
export async function deleteCloudinaryImage(imageUrl: string): Promise<void> {
  try {
    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
    const urlParts = imageUrl.split("/");
    const publicIdWithExtension = urlParts[urlParts.length - 1];
    const publicId = `ev-stations/${publicIdWithExtension?.split(".")[0]}`;

    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    throw error;
  }
}

// Helper function to delete multiple images
export async function deleteCloudinaryImages(
  imageUrls: string[],
): Promise<void> {
  try {
    await Promise.all(imageUrls.map((url) => deleteCloudinaryImage(url)));
  } catch (error) {
    console.error("Error deleting images from Cloudinary:", error);
    throw error;
  }
}

export default cloudinary;
