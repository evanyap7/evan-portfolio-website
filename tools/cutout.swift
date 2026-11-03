// Cuts the subject out of a photo with Vision's foreground mask and writes it
// as a PNG with the mask as alpha, trimmed to the subject's bounding box.
// Runs offline on macOS 14 or later:
//
//   swift tools/cutout.swift img/evan.jpg out.png
//
// Used once to make img/evan-holo.webp for the lab's hologram (js/lab/hologram.js).

import CoreImage
import CoreImage.CIFilterBuiltins
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

func fail(_ message: String) -> Never {
    FileHandle.standardError.write("cutout: \(message)\n".data(using: .utf8)!)
    exit(1)
}

let args = CommandLine.arguments
guard args.count == 3 else { fail("usage: swift tools/cutout.swift <input image> <output.png>") }
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])

guard let source = CGImageSourceCreateWithURL(input as CFURL, nil),
      let photo = CGImageSourceCreateImageAtIndex(source, 0, nil) else { fail("cannot read \(input.path)") }

let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(cgImage: photo, options: [:])
do {
    try handler.perform([request])
} catch {
    fail("the mask request failed: \(error.localizedDescription)")
}
guard let observation = request.results?.first, !observation.allInstances.isEmpty else { fail("no subject found in \(input.path)") }

let maskBuffer: CVPixelBuffer
do {
    maskBuffer = try observation.generateScaledMaskForImage(forInstances: observation.allInstances, from: handler)
} catch {
    fail("cannot scale the mask: \(error.localizedDescription)")
}

let image = CIImage(cgImage: photo)
let mask = CIImage(cvPixelBuffer: maskBuffer)
let blend = CIFilter.blendWithMask()
blend.inputImage = image
blend.backgroundImage = CIImage(color: .clear).cropped(to: image.extent)
blend.maskImage = mask
guard let cut = blend.outputImage else { fail("cannot apply the mask") }

// The subject's bounding box: the mask's non-zero extent.
let context = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!])
guard let maskImage = context.createCGImage(mask, from: mask.extent) else { fail("cannot read the mask") }
let width = maskImage.width
let height = maskImage.height
var pixels = [UInt8](repeating: 0, count: width * height)
guard let gray = CGContext(data: &pixels, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width,
                           space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue) else { fail("cannot draw the mask") }
gray.draw(maskImage, in: CGRect(x: 0, y: 0, width: width, height: height))
var minX = width, minY = height, maxX = -1, maxY = -1
for y in 0..<height {
    for x in 0..<width where pixels[y * width + x] > 8 {
        minX = min(minX, x); maxX = max(maxX, x)
        minY = min(minY, y); maxY = max(maxY, y)
    }
}
guard maxX >= minX, maxY >= minY else { fail("the mask is empty") }
// Rows in `pixels` run top-down; Core Image's origin is bottom-left.
let box = CGRect(x: minX, y: height - 1 - maxY, width: maxX - minX + 1, height: maxY - minY + 1)

guard let result = context.createCGImage(cut, from: box, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!) else { fail("cannot render the cutout") }
guard let destination = CGImageDestinationCreateWithURL(output as CFURL, UTType.png.identifier as CFString, 1, nil) else { fail("cannot write \(output.path)") }
CGImageDestinationAddImage(destination, result, nil)
guard CGImageDestinationFinalize(destination) else { fail("cannot write \(output.path)") }
print("cutout: \(output.path) \(result.width)×\(result.height)")
