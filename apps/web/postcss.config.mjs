import postcssCalc from 'postcss-calc'
import postcssCombineDuplicatedSelectors from 'postcss-combine-duplicated-selectors'
import postcssFontDisplay from 'postcss-font-display'
import postcssPresetEnv from 'postcss-preset-env'
import postcssPxToRem from 'postcss-pxtorem'
import postcssSortMediaQueries from 'postcss-sort-media-queries'

export default {
  plugins: [
    postcssPxToRem({
      propList: ['font', 'font-size', 'line-height', 'letter-spacing', 'margin*', 'padding*'],
      replace: true,
    }),
    postcssPresetEnv({
      stage: 2,
      features: { 'nesting-rules': true },
    }),
    postcssCalc({
      precision: 5,
    }),
    postcssFontDisplay({
      display: 'swap',
    }),
    postcssCombineDuplicatedSelectors(),
    postcssSortMediaQueries({
      sort: 'mobile-first',
    }),
  ],
}
