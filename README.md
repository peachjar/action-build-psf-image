<p align="center">
  <a href="https://github.com/peachjar/action-build-psf-image/actions"><img alt="typescript-action status" src="https://github.com/peachjar/action-build-psf-image/workflows/build-test/badge.svg"></a>
</p>

# Github Action: Build PSF Image

This action will build and test a PSF/BFF Docker image.

## Usage

```
uses: peachjar/action-build-psf-image@v1
```

And if you want to skip integration tests:

```
uses: peachjar/action-build-psf-image@v1
with:
  skipIntegrationTests: true
```

And if you want a custom image name:

```
uses: peachjar/action-build-psf-image@v1
with:
  imageName: foobar
```
