import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { pathOr, compose } from 'ramda'
import { CollectionBadges, DiscountBadge } from 'vtex.store-components'
import classNames from 'classnames'
import { useDevice } from 'vtex.device-detector'
import { useResponsiveValues } from 'vtex.responsive-values'
import { useCssHandles, applyModifiers } from 'vtex.css-handles'
import { useProduct } from 'vtex.product-context'

import ImagePlaceholder from './ImagePlaceholder'

import { useProductSummary } from 'vtex.product-summary-context/ProductSummaryContext'

import productSummary from '../../productSummary.css'

import { changeImageUrlSize } from '../../utils/normalize'

const CSS_HANDLES = ['image', 'imageContainer', 'product', 'imagePlaceholder']

const maybeBadge = ({ listPrice, price, label }) => shouldShow => component => {
  if (shouldShow) {
    return (
      <DiscountBadge listPrice={listPrice} sellingPrice={price} label={label}>
        {component}
      </DiscountBadge>
    )
  }
  return component
}

const maybeCollection = ({ productClusters }) => shouldShow => component => {
  if (shouldShow && productClusters && productClusters.length > 0) {
    const collections = productClusters.map(cl => cl.name)
    return (
      <CollectionBadges collectionBadgesText={collections}>
        {component}
      </CollectionBadges>
    )
  }
  return component
}

const findImageByLabel = (images, selectedLabel) => {
  if (!selectedLabel) {
    return null
  }
  return images.find(({ imageLabel }) => imageLabel === selectedLabel)
}

const Image = ({ src, width, height, onError, alt, className }) => {
  const { isMobile } = useDevice()

  /** TODO: Previously it was as follows :
   * 
  const dpi = window.devicePixelRatio || (isMobile ? 2 : 1)
   *
   * it seems good, because it takes the actual user's screen density
   * into account, but causes images to be re-downloaded if the initial
   * device-based guess was wrong. Has to be looked into */
  const dpi = isMobile ? 2 : 1

  const shouldResize = !!(width || height)

  return (
    <img
      src={
        shouldResize ? changeImageUrlSize(src, width * dpi, height * dpi) : src
      }
      style={
        shouldResize
          ? {
              width: '100%',
              height,
              objectFit: 'contain',
              maxHeight: 'unset',
              maxWidth: width,
            }
          : null
      }
      loading={shouldResize ? 'lazy' : 'auto'}
      alt={alt}
      className={className}
      onError={onError}
    />
  )
}

const ProductImageContent = ({
  product,
  onError,
  hasError,
  showBadge,
  badgeText,
  displayMode,
  mainImageLabel,
  hoverImageLabel,
  showCollections,
  width: widthProp,
  height: heightProp,
}) => {
  const handles = useCssHandles(CSS_HANDLES)
  const { isMobile } = useDevice()
  const {
    skuSelector: { selectedImageVariationSKU },
  } = useProduct()

  const { productClusters, productName: name } = product || {}
  const sku = product && product.sku

  const [width, height] = [
    // fallsback to the other remaining value, if not defined
    parseFloat(widthProp || heightProp || 0),
    parseFloat(heightProp || widthProp || 0),
  ]

  const legacyContainerClasses = classNames(
    productSummary.imageStackContainer,
    productSummary.hoverEffect
  )

  const containerClassname = classNames(
    'dib relative',
    handles.imageContainer,
    legacyContainerClasses
  )

  if (!sku || hasError) {
    return (
      <div className={containerClassname}>
        <ImagePlaceholder cssHandle={handles.productImage} />
      </div>
    )
  }

  const images = pathOr([], ['images'], sku)
  const hoverImage = findImageByLabel(images, hoverImageLabel)

  let imageUrl = pathOr({}, ['image', 'imageUrl'], sku)

  if (selectedImageVariationSKU == null && mainImageLabel) {
    const mainImage = findImageByLabel(images, mainImageLabel)
    if (mainImage) {
      imageUrl = mainImage.imageUrl
    }
  }

  const legacyImageClasses = classNames({
    [productSummary.imageNormal]: displayMode !== 'inline',
    [productSummary.imageInline]: displayMode === 'inline',
  })

  // TODO: change ProductSummaryContext to have `selectedSku` field instead of `sku`
  const commertialOffer = pathOr(
    {},
    ['sku', 'seller', 'commertialOffer'],
    product
  )

  const withBadge = maybeBadge({
    listPrice: commertialOffer.ListPrice,
    price: commertialOffer.Price,
    label: badgeText,
  })

  const withCollection = maybeCollection({ productClusters })

  const imageClassname = classNames(legacyImageClasses, handles.image)

  const hoverImageClassname = classNames(
    'w-100 h-100 dn absolute top-0 left-0 z-999',
    applyModifiers(handles.image, 'hover'),
    legacyImageClasses,
    productSummary.hoverImage
  )

  const img = (
    <div className={containerClassname}>
      <Image
        src={imageUrl}
        width={width}
        height={height}
        alt={name}
        className={imageClassname}
        onError={onError}
      />
      {hoverImage && !isMobile && (
        <Image
          src={hoverImage.imageUrl}
          width={width}
          height={height}
          alt={name}
          className={hoverImageClassname}
          onError={onError}
        />
      )}
    </div>
  )

  return compose(
    withBadge(showBadge),
    withCollection(showCollections)
  )(img)
}

const ProductImage = ({
  showBadge,
  badgeText,
  displayMode,
  mainImageLabel,
  hoverImageLabel,
  showCollections,
  width: widthProp,
  height: heightProp,
}) => {
  const { product } = useProductSummary()

  const { widthProp: width, heightProp: height } = useResponsiveValues({
    widthProp,
    heightProp,
  })

  const [error, setError] = useState(false)

  const imageClassName = classNames(productSummary.imageContainer, {
    'db w-100 center': displayMode !== 'inline',
  })

  return (
    <div className={imageClassName}>
      <ProductImageContent
        width={width}
        height={height}
        hasError={error}
        product={product}
        badgeText={badgeText}
        showBadge={showBadge}
        displayMode={displayMode}
        onError={() => setError(true)}
        mainImageLabel={mainImageLabel}
        hoverImageLabel={hoverImageLabel}
        showCollections={showCollections}
      />
    </div>
  )
}

ProductImage.propTypes = {
  /** Set the discount badge's visibility */
  showBadge: PropTypes.bool,
  /** Text shown on badge */
  badgeText: PropTypes.string,
  /** Defines if the collection badges are shown */
  showCollections: PropTypes.bool,
  /** Display mode of the summary */
  displayMode: PropTypes.oneOf(['normal', 'inline']),
  hoverImageLabel: PropTypes.string,
  mainImageLabel: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
}

ProductImage.defaultProps = {
  showBadge: true,
  showCollections: false,
  displayMode: 'normal',
  hoverImageLabel: '',
  mainImageLabel: '',
}

ProductImage.getSchema = () => {
  return {
    title: 'admin/editor.productSummaryImage.title',
    description: 'admin/editor.productSummaryImage.description',
    type: 'object',
    properties: {
      showBadge: {
        type: 'boolean',
        title: 'admin/editor.productSummary.showBadge.title',
        default: ProductImage.defaultProps.showBadge,
        isLayout: true,
      },
      showCollections: {
        type: 'boolean',
        title: 'admin/editor.productSummary.showCollections.title',
        default: ProductImage.defaultProps.showCollections,
        isLayout: true,
      },
      displayMode: {
        title: 'admin/editor.productSummary.displayMode.title',
        type: 'string',
        enum: ['normal', 'inline'],
        default: ProductImage.defaultProps.displayMode,
        isLayout: true,
      },
      hoverImageLabel: {
        title: 'admin/editor.productSummaryImage.hoverImageLabel.title',
        type: 'string',
        default: '',
        isLayout: false,
      },
    },
  }
}

export default ProductImage
