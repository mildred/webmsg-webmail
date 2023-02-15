#!/bin/sh

dev=false
run_vite=false
app=app

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev)
      dev=true
      shift
      ;;
    --vite)
      run_vite=true
      shift
      ;;
    *)
      break
      ;;
  esac
done

git_manifest(){
  echo "$(git rev-parse --verify HEAD)";
  git -c core.quotePath=0 ls-tree --format='%(objectname) %(path)' -r HEAD
}

hugo

if $dev; then

  git_manifest >MANIFEST.git

  rm -rf public/$app
  ln -s ../src/ public/$app

  mkdir -p vite-public
  rm -f vite-public/src
  ln -s .. vite-public/src

else

  npm run build

  rm -rf public/$app
  mkdir public/$app
  cp src/dist/* public/$app
  cp src/popup.html public/$app

  rm -rf public/src
  mkdir public/src
  git archive HEAD | (cd  public/src; tar x)
  git_manifest >public/src/MANIFEST.git

fi

if $dev && $run_vite; then
  set -x
  exec vite
fi
